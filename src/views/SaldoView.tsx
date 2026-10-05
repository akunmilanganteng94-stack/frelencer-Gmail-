import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime, isValidPhoneNumber } from '../lib/utils';
import { Withdrawal, WithdrawalMethod } from '../types';
import {
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyDataChange } from '../lib/syncHelper';
import {
  Wallet,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Download,
  History,
  RefreshCw,
  Smartphone,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SaldoView() {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [method, setMethod] = useState<WithdrawalMethod>('DANA');
  const [targetNumber, setTargetNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  // State untuk Nomor E-Wallet Tersimpan
  const [savedMethod, setSavedMethod] = useState<WithdrawalMethod>('DANA');
  const [savedNumber, setSavedNumber] = useState<string>('');
  const [savedName, setSavedName] = useState<string>('');
  const [savingEwallet, setSavingEwallet] = useState(false);

  // Muat data e-wallet tersimpan dari profil pengguna
  useEffect(() => {
    if (userProfile) {
      if (userProfile.savedEwalletMethod) {
        setSavedMethod(userProfile.savedEwalletMethod);
      }
      if (userProfile.savedEwalletNumber) {
        setSavedNumber(userProfile.savedEwalletNumber);
      }
      if (userProfile.savedEwalletName) {
        setSavedName(userProfile.savedEwalletName);
      } else if (userProfile.displayName) {
        setSavedName(userProfile.displayName);
      }
    }
  }, [userProfile]);

  const handleRefreshBalance = async () => {
    setRefreshingBalance(true);
    try {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          showToast(
            'success',
            'Saldo Diperbarui',
            `Saldo saat ini: ${formatRupiah(data.balance || 0)}`
          );
        } else {
          showToast('info', 'Saldo Disinkronkan', 'Data saldo Anda sudah dalam kondisi terbaru.');
        }
      }
    } catch (err) {
      console.warn('Refresh balance err:', err);
      showToast('info', 'Saldo Disinkronkan', 'Data saldo Anda sudah dalam kondisi terbaru.');
    } finally {
      setTimeout(() => setRefreshingBalance(false), 450);
    }
  };

  const handleSaveEwallet = async () => {
    if (!currentUser) return;
    const cleanNumber = savedNumber.trim();
    if (!cleanNumber) {
      showToast('error', 'Nomor Kosong', 'Harap masukkan nomor e-wallet yang valid.');
      return;
    }
    if (!isValidPhoneNumber(cleanNumber)) {
      showToast('error', 'Nomor Tidak Valid', 'Format nomor e-wallet tidak valid. Contoh: 081234567890.');
      return;
    }
    if (!savedName.trim()) {
      showToast('error', 'Nama Kosong', 'Harap masukkan nama pemilik akun e-wallet.');
      return;
    }

    setSavingEwallet(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedEwalletMethod: savedMethod,
        savedEwalletNumber: cleanNumber,
        savedEwalletName: savedName.trim(),
      });
      showToast(
        'success',
        'E-Wallet Tersimpan',
        `Nomor ${savedMethod} ${cleanNumber} (a.n. ${savedName.trim()}) berhasil disimpan.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menyimpan', msg);
    } finally {
      setSavingEwallet(false);
    }
  };

  const minWithdrawal = settings.minWithdrawal || 4000;
  const parsedAmount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10) || 0;
  const hasPerakan = parsedAmount > 0 && parsedAmount % 1000 !== 0;

  const isDanaOpen = settings.withdrawalDanaOpen !== false;
  const isGopayOpen = settings.withdrawalGopayOpen !== false;
  const isAnyWithdrawalOpen = settings.withdrawalOpen !== false && (isDanaOpen || isGopayOpen);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Withdrawal[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<Withdrawal, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawals(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Withdrawals snapshot warning:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const handleOpenWithdrawModal = () => {
    if (!isAnyWithdrawalOpen) {
      showToast(
        'error',
        'Penarikan Ditutup',
        'Fitur penarikan saldo e-wallet saat ini sedang ditutup sementara oleh admin.'
      );
      return;
    }
    if (userProfile?.status === 'suspended') {
      showToast('error', 'Akun Dibatasi', 'Akun Anda sedang dibatasi. Tidak dapat melakukan penarikan.');
      return;
    }
    const currentBalance = userProfile?.balance || 0;
    if (currentBalance < minWithdrawal) {
      showToast(
        'error',
        'Saldo Kurang',
        `Saldo minimum untuk penarikan adalah ${formatRupiah(minWithdrawal)}.`
      );
      return;
    }

    // Pre-fill dari e-wallet tersimpan jika tersedia
    const defaultMethod = savedMethod || 'DANA';
    if (defaultMethod === 'DANA' && isDanaOpen) {
      setMethod('DANA');
    } else if (defaultMethod === 'GoPay' && isGopayOpen) {
      setMethod('GoPay');
    } else if (isDanaOpen) {
      setMethod('DANA');
    } else if (isGopayOpen) {
      setMethod('GoPay');
    }

    setTargetNumber(savedNumber || userProfile?.savedEwalletNumber || '');
    setRecipientName(savedName || userProfile?.savedEwalletName || userProfile?.displayName || '');
    setAmountInput('');
    setFormError('');
    setIsConfirmed(false);
    setShowWithdrawModal(true);
  };

  const handleWithdrawSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentUser || !userProfile) return;
    if (!isAnyWithdrawalOpen) {
      setFormError('Layanan penarikan sedang ditutup oleh admin.');
      return;
    }
    if (method === 'DANA' && !isDanaOpen) {
      setFormError('Penarikan melalui DANA sedang ditutup oleh admin. Silakan gunakan metode lain.');
      return;
    }
    if (method === 'GoPay' && !isGopayOpen) {
      setFormError('Penarikan melalui GoPay sedang ditutup oleh admin. Silakan gunakan metode lain.');
      return;
    }

    const currentBalance = userProfile.balance || 0;
    const numericAmount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Masukkan nominal penarikan yang valid.');
      return;
    }
    if (numericAmount % 1000 !== 0) {
      setFormError(
        'Penarikan tidak boleh ada perakan! Nominal wajib bulat kelipatan Rp 1.000 (contoh: 5.000, 10.000, dst.).'
      );
      return;
    }
    if (numericAmount < minWithdrawal) {
      setFormError(`Minimal penarikan adalah ${formatRupiah(minWithdrawal)}.`);
      return;
    }
    if (numericAmount > currentBalance) {
      setFormError(
        `Saldo kamu tidak mencukupi untuk nominal ${formatRupiah(numericAmount)}. Saldo saat ini: ${formatRupiah(currentBalance)}.`
      );
      return;
    }

    const cleanedNumber = targetNumber.trim();
    if (!isValidPhoneNumber(cleanedNumber)) {
      setFormError('Nomor tujuan e-wallet tidak valid. Format: 08xxx (10-13 digit).');
      return;
    }
    if (!recipientName.trim()) {
      setFormError('Nama pemilik akun e-wallet wajib diisi.');
      return;
    }
    if (!isConfirmed) {
      setFormError('Harap centang konfirmasi bahwa data nomor dan nama penerima sudah benar.');
      return;
    }

    setSubmitting(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const newWithdrawalRef = doc(collection(db, 'withdrawals'));

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('Data pengguna tidak ditemukan.');
        }

        const userData = userDoc.data();
        const availableBal = userData.balance || 0;
        if (availableBal < numericAmount) {
          throw new Error(`Saldo tidak mencukupi. Saldo saat ini: ${formatRupiah(availableBal)}`);
        }

        transaction.update(userRef, {
          balance: availableBal - numericAmount,
          pendingWithdrawn: (userData.pendingWithdrawn || 0) + numericAmount,
        });

        const withdrawalPayload: Omit<Withdrawal, 'id'> = {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          userName: userProfile.displayName || 'User',
          amount: numericAmount,
          method,
          targetNumber: cleanedNumber,
          recipientName: recipientName.trim(),
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };

        transaction.set(newWithdrawalRef, withdrawalPayload);
      });

      notifyDataChange('withdrawal');
      showToast(
        'success',
        'Penarikan Berhasil Diajukan',
        `Permintaan penarikan ${formatRupiah(numericAmount)} ke ${method} (${cleanedNumber}) sedang diproses admin.`
      );
      setShowWithdrawModal(false);
      setAmountInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Withdrawal error:', msg);
      setFormError(msg);
      showToast('error', 'Gagal Mengajukan Penarikan', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const userBalance = userProfile?.balance || 0;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
      {/* 1. KARTU "SALDO SAAT INI" DENGAN GRADIENT BIRU */}
      <div className="rounded-[28px] sm:rounded-3xl bg-gradient-to-br from-[#1677E8] via-[#126FE3] to-[#0A53B7] p-5 sm:p-7 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden transition-all">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-blue-950/30 blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header Baris Saldo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
                <Wallet className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-wide text-blue-100 uppercase">
                Saldo saat ini
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefreshBalance}
              disabled={refreshingBalance}
              className="p-1.5 rounded-full text-blue-100/90 hover:text-white hover:bg-white/15 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Perbarui Saldo Realtime"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshingBalance ? 'animate-spin text-white' : ''}`}
              />
            </button>
          </div>

          {/* Nominal Saldo Besar */}
          <div className="py-1">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
              {formatRupiah(userBalance)}
            </div>
          </div>

          {/* Tombol Tarik Saldo di Dalam Kartu */}
          <div>
            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={!isAnyWithdrawalOpen || userBalance < minWithdrawal}
              className="w-full py-3.5 px-6 rounded-2xl bg-white text-[#0D5FC7] hover:bg-blue-50 active:scale-[0.99] font-black text-sm sm:text-base shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Tarik Saldo</span>
            </button>
            {/* Informasi Minimum Penarikan di Bawah Tombol */}
            <p className="text-center text-xs text-blue-100/90 mt-2 font-medium">
              Minimal penarikan {formatRupiah(minWithdrawal)}
            </p>
          </div>

          {/* Status Penarikan: 🟢 Dibuka */}
          <div className="pt-3.5 border-t border-white/15 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-blue-100">
              Status Penarikan:
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold border border-white/20 text-white shadow-xs">
              <span className={`w-2 h-2 rounded-full ${isAnyWithdrawalOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>{isAnyWithdrawalOpen ? '🟢 Dibuka' : '🔴 Ditutup'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BAGIAN "NOMOR E-WALLET TERSIMPAN" (CARD PUTIH) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Nomor E-Wallet Tersimpan
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Pilih e-wallet dan simpan nomor akun Anda untuk penarikan instan
              </p>
            </div>
          </div>
          {userProfile?.savedEwalletNumber && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Tersimpan
            </span>
          )}
        </div>

        {/* Pilihan E-Wallet: Hanya DANA dan GoPay (DANA pilihan 1, GoPay pilihan 2) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Pilih E-Wallet
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Pilihan 1: DANA (Default) */}
            <button
              type="button"
              onClick={() => setSavedMethod('DANA')}
              className={`p-3.5 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer ${
                savedMethod === 'DANA'
                  ? 'border-[#118EEA] bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-black text-slate-900">
                  DANA
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Pilihan 1</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  savedMethod === 'DANA' ? 'border-[#118EEA] bg-[#118EEA]' : 'border-slate-300'
                }`}
              >
                {savedMethod === 'DANA' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>

            {/* Pilihan 2: GoPay */}
            <button
              type="button"
              onClick={() => setSavedMethod('GoPay')}
              className={`p-3.5 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer ${
                savedMethod === 'GoPay'
                  ? 'border-[#00AA13] bg-emerald-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-black text-slate-900">
                  GoPay
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Pilihan 2</span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  savedMethod === 'GoPay' ? 'border-[#00AA13] bg-[#00AA13]' : 'border-slate-300'
                }`}
              >
                {savedMethod === 'GoPay' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          </div>
        </div>

        {/* Input Form Nomor E-Wallet & Nama Pemilik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nomor {savedMethod}
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                value={savedNumber}
                onChange={(e) => setSavedNumber(e.target.value)}
                placeholder="Contoh: 08xxxxxxxxxx"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-mono outline-none bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Pemilik Akun {savedMethod}
            </label>
            <input
              type="text"
              value={savedName}
              onChange={(e) => setSavedName(e.target.value)}
              placeholder="Nama lengkap sesuai akun e-wallet"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none bg-white transition"
            />
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            * Data e-wallet ini akan tersimpan permanen dan otomatis dimuat saat penarikan.
          </p>
          <button
            type="button"
            onClick={handleSaveEwallet}
            disabled={savingEwallet}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1677E8] to-[#0D5FC7] hover:from-[#1366cc] hover:to-[#094ba1] text-white text-xs sm:text-sm font-black shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {savingEwallet ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Simpan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. BAGIAN "RIWAYAT PENARIKAN" DENGAN TABEL / DAFTAR */}
      <div id="withdrawal-history-table" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
              <History className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Riwayat Penarikan
              </h2>
              <p className="text-[11px] text-slate-500">
                Daftar permohonan pencairan saldo ke akun e-wallet Anda
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {withdrawals.length} Transaksi
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
            <ArrowDownLeft className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-sm">Belum Ada Riwayat Penarikan</p>
            <p className="text-slate-400 max-w-xs mx-auto">
              Saat Anda menarik saldo, seluruh status transfer akan tercatat secara detail di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            {/* Tabel Riwayat Penarikan */}
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-3 rounded-l-xl">Tanggal</th>
                  <th className="px-3.5 py-3">Metode</th>
                  <th className="px-3.5 py-3">Nomor Tujuan</th>
                  <th className="px-3.5 py-3">Nominal</th>
                  <th className="px-3.5 py-3 text-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.map((w) => {
                  const isSuccess = w.status === 'Selesai';
                  const isRejected = w.status === 'Ditolak';
                  const isPending = w.status === 'Pending';

                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-blue-50/30 transition group"
                    >
                      <td className="px-3.5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatIndonesianDateTime(w.createdAt)}
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {w.method}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {w.targetNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px] sm:max-w-xs">
                          a.n. {w.recipientName}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap font-black text-slate-900 text-xs sm:text-sm">
                        {formatRupiah(w.amount)}
                      </td>
                      <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {isSuccess && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                            {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                            <span>{w.status}</span>
                          </span>
                          {isRejected && w.rejectionReason && (
                            <span
                              className="text-[9px] text-rose-700 max-w-[150px] truncate"
                              title={w.rejectionReason}
                            >
                              {w.rejectionReason}
                            </span>
                          )}
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

      {/* MODAL TARIK SALDO */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Form Penarikan Saldo
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Saldo: <strong className="text-blue-700 font-extrabold">{formatRupiah(userBalance)}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm cursor-pointer transition font-bold"
                >
                  &times;
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Nominal Penarikan
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Sisa: <strong className={userBalance - parsedAmount < 0 ? 'text-rose-600' : 'text-slate-700'}>{formatRupiah(Math.max(0, userBalance - parsedAmount))}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder={`Min. ${minWithdrawal.toLocaleString('id-ID')} (tanpa perakan)`}
                      value={amountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setAmountInput(val);
                        setFormError('');
                      }}
                      className={`w-full pl-9 pr-20 py-2.5 rounded-xl border font-mono font-bold text-sm outline-none transition ${
                        hasPerakan
                          ? 'border-rose-400 bg-rose-50/40 text-rose-800 focus:ring-2 focus:ring-rose-400/20'
                          : 'border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const maxRound = Math.floor(userBalance / 1000) * 1000;
                        if (maxRound >= minWithdrawal) {
                          setAmountInput(String(maxRound));
                          setFormError('');
                        } else {
                          setFormError(`Saldo Anda kurang dari minimal penarikan (${formatRupiah(minWithdrawal)}).`);
                        }
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1677E8] text-xs font-bold border border-blue-200 cursor-pointer active:scale-95 transition"
                    >
                      Maksimal
                    </button>
                  </div>
                  {hasPerakan ? (
                    <p className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <span>Dilarang perakan (Rp {(parsedAmount % 1000).toLocaleString('id-ID')}). Wajib kelipatan Rp 1.000.</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      * Minimal {formatRupiah(minWithdrawal)}, wajib kelipatan Rp 1.000 tanpa perakan.
                    </p>
                  )}
                </div>

                {/* Pilihan Metode: Hanya DANA dan GoPay */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Metode E-Wallet
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DANA', 'GoPay'] as const).map((m) => {
                      const isOpen = m === 'DANA' ? isDanaOpen : isGopayOpen;
                      if (!isOpen) {
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled
                            className="py-2 px-3 rounded-xl border text-xs font-bold bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed flex items-center justify-between opacity-60"
                          >
                            <span>{m}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-extrabold">
                              Tutup
                            </span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={`py-2 px-3 rounded-xl border text-xs font-black transition flex items-center justify-between cursor-pointer ${
                            method === m
                              ? 'bg-[#1677E8] border-[#1677E8] text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{m}</span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              method === m ? 'border-white bg-white' : 'border-slate-300'
                            }`}
                          >
                            {method === m && <span className="w-1.5 h-1.5 rounded-full bg-[#1677E8]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Tujuan {method}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08xxxxxxxxxx"
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-blue-500/20 text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Pemilik Akun {method}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap sesuai akun e-wallet"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 pt-1">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <span>Data nomor dan nama pemilik {method} sudah benar.</span>
                </label>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !isConfirmed ||
                      hasPerakan ||
                      parsedAmount < minWithdrawal ||
                      parsedAmount > userBalance
                    }
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1677E8] to-[#0D5FC7] hover:from-[#1366cc] hover:to-[#094ba1] text-white text-xs font-black shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Tarik {parsedAmount >= minWithdrawal && !hasPerakan ? formatRupiah(parsedAmount) : ''}</span>
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
