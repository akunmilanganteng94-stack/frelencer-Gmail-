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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
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

  const minWithdrawal = settings.minWithdrawal || 2000;
  const parsedAmount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10) || 0;
  const hasPerakan = parsedAmount > 0 && parsedAmount % 1000 !== 0;

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
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Withdrawal, 'id'>) });
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
    if (!settings.withdrawalOpen) {
      showToast('error', 'Penarikan Ditutup', 'Fitur penarikan saldo saat ini sedang ditutup sementara oleh admin.');
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

    setAmountInput('');
    setFormError('');
    setIsConfirmed(false);
    setShowWithdrawModal(true);
  };

  const handleWithdrawSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentUser || !userProfile) return;

    if (!settings.withdrawalOpen) {
      setFormError('Layanan penarikan sedang ditutup oleh admin.');
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
        'Penarikan tidak boleh ada perakan! Nominal wajib bulat kelipatan Rp 1.000 (contoh: 2.000, 5.000, 10.000, dst.).'
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

      showToast(
        'success',
        'Penarikan Berhasil Diajukan',
        `Permintaan penarikan ${formatRupiah(numericAmount)} ke ${method} (${cleanedNumber}) sedang diproses admin.`
      );

      setShowWithdrawModal(false);
      setTargetNumber('');
      setRecipientName('');
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
  const totalEarned = userProfile?.totalEarned || 0;
  const totalWithdrawn = userProfile?.totalWithdrawn || 0;
  const pendingWithdrawn = userProfile?.pendingWithdrawn || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Wallet className="w-7 h-7 text-blue-600" />
          <span>Saldo & Penarikan</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Kelola saldo dompet freelancer kamu dan lakukan pencairan ke DANA atau GoPay
        </p>
      </div>

      {!settings.withdrawalOpen && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">Penarikan Saldo Ditutup Sementara</div>
            <p className="text-xs text-amber-800 mt-0.5">
              Admin sedang melakukan penyesuaian operasional pencairan dana. Silakan coba kembali nanti.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kartu Saldo Tersedia - Warna Biru Tua dengan Gradient Biru Muda */}
        <div className="rounded-[28px] bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#38bdf8] p-6 text-white shadow-xl shadow-blue-900/25 border border-blue-400/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-sky-300/20 blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  <Wallet className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span className="text-xs font-bold text-white tracking-wide uppercase">SALDO ANDA</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight drop-shadow-xs">
              {formatRupiah(userBalance)}
            </div>
            <div className="mt-2 text-xs text-sky-100 flex items-center justify-between">
              <span>Min. Tarik:</span>
              <strong className="text-white font-bold">{formatRupiah(minWithdrawal)} (Bulat)</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 relative z-10">
            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={!settings.withdrawalOpen || userBalance < minWithdrawal}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs border border-white/30 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4 text-sky-200" />
              <span>Tarik Saldo</span>
            </button>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Penghasilan</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {formatRupiah(totalEarned)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Akumulasi submission diterima</div>
        </div>

        <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Dicairkan</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {formatRupiah(totalWithdrawn)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Dana telah masuk ke e-wallet</div>
        </div>

        <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Penarikan Pending</span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
            {formatRupiah(pendingWithdrawn)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Sedang diproses transfer admin</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Penarikan Saldo</h2>
            <p className="text-xs text-slate-500">Catatan permohonan transfer ke e-wallet kamu</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{withdrawals.length} Transaksi</span>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
            <ArrowDownLeft className="w-8 h-8 mx-auto text-slate-300" />
            <p>Belum ada riwayat penarikan saldo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-blue-200 hover:shadow-xs transition space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        w.method === 'DANA'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {w.method}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatRupiah(w.amount)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Tujuan: <strong>{w.targetNumber}</strong> a.n. <strong>{w.recipientName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-[11px] text-slate-400">
                      {formatIndonesianDateTime(w.createdAt)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        w.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : w.status === 'Ditolak'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {w.status === 'Selesai' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {w.status === 'Ditolak' && <XCircle className="w-3.5 h-3.5" />}
                      {w.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                      <span>{w.status}</span>
                    </span>
                  </div>
                </div>

                {w.status === 'Ditolak' && w.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Alasan Penolakan:</strong> {w.rejectionReason} (Saldo telah dikembalikan ke akun).
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      Tarik Saldo
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Saldo: <strong className="text-blue-700 font-extrabold">{formatRupiah(userBalance)}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-sm cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
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
                      className={`w-full pl-9 pr-20 py-2 rounded-xl border font-mono font-bold text-sm outline-none transition ${
                        hasPerakan
                          ? 'border-rose-400 bg-rose-50/40 text-rose-800 focus:ring-2 focus:ring-rose-400/20'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-900'
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
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 cursor-pointer active:scale-95 transition"
                    >
                      Maksimal
                    </button>
                  </div>
                  {hasPerakan ? (
                    <p className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <span>⚠️ Dilarang perakan (Rp {(parsedAmount % 1000).toLocaleString('id-ID')}). Wajib kelipatan 1.000.</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400">
                      * Minimal {formatRupiah(minWithdrawal)}, wajib kelipatan Rp 1.000 tanpa perakan.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Metode
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['DANA', 'GoPay'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition text-center cursor-pointer ${
                            method === m
                              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor {method}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 08xxxxxxxxxx"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-mono outline-none"
                    />
                  </div>
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 pt-0.5">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <span>Data nomor dan nama pemilik {method} sudah benar.</span>
                </label>

                <div className="pt-1.5 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-bold hover:bg-slate-50 transition cursor-pointer"
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
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
