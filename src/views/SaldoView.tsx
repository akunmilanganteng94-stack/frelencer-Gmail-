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

export const WITHDRAWAL_PRESETS = [
  { value: 2000, label: '2k', text: 'Rp 2.000' },
  { value: 4000, label: '4k', text: 'Rp 4.000' },
  { value: 6000, label: '6k', text: 'Rp 6.000' },
  { value: 10000, label: '10k', text: 'Rp 10.000' },
  { value: 20000, label: '20k', text: 'Rp 20.000' },
  { value: 50000, label: '50k', text: 'Rp 50.000' },
  { value: 100000, label: '100k', text: 'Rp 100.000' },
] as const;

export function SaldoView() {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState<number>(2000);
  const [method, setMethod] = useState<WithdrawalMethod>('DANA');
  const [targetNumber, setTargetNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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
    const lowestNominal = WITHDRAWAL_PRESETS[0].value; // 2000 (2k)
    if ((userProfile?.balance || 0) < lowestNominal) {
      showToast(
        'error',
        'Saldo Kurang',
        `Saldo minimum untuk penarikan adalah ${formatRupiah(lowestNominal)} (2k).`
      );
      return;
    }

    const currentValid = WITHDRAWAL_PRESETS.find(
      (opt) => opt.value === amount && opt.value <= (userProfile?.balance || 0)
    );
    setAmount(currentValid ? currentValid.value : lowestNominal);
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
    const validOption = WITHDRAWAL_PRESETS.find((opt) => opt.value === amount);
    if (!validOption) {
      setFormError('Harap pilih salah satu nominal penarikan resmi dari admin (2k, 4k, 6k, 10k, 20k, 50k, 100k).');
      return;
    }

    if (amount > currentBalance) {
      setFormError(`Saldo kamu tidak mencukupi untuk nominal ${formatRupiah(amount)} (${validOption.label}). Saldo saat ini: ${formatRupiah(currentBalance)}.`);
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
        if (availableBal < amount) {
          throw new Error(`Saldo tidak mencukupi. Saldo saat ini: ${formatRupiah(availableBal)}`);
        }

        transaction.update(userRef, {
          balance: availableBal - amount,
          pendingWithdrawn: (userData.pendingWithdrawn || 0) + amount,
        });

        const withdrawalPayload: Omit<Withdrawal, 'id'> = {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          userName: userProfile.displayName || 'User',
          amount: Number(amount),
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
        `Permintaan penarikan ${formatRupiah(amount)} ke ${method} (${cleanedNumber}) sedang diproses admin.`
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
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-100">Saldo Tersedia</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatRupiah(userBalance)}
            </div>
            <div className="mt-2 text-xs text-blue-100 flex items-center justify-between">
              <span>Min. Tarik:</span>
              <strong>{formatRupiah(WITHDRAWAL_PRESETS[0].value)} ({WITHDRAWAL_PRESETS[0].label})</strong>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/20">
            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={!settings.withdrawalOpen || userBalance < WITHDRAWAL_PRESETS[0].value}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4 text-blue-700" />
              <span>Tarik Saldo</span>
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Total Penghasilan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totalEarned)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Akumulasi submission diterima</div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Total Dicairkan</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totalWithdrawn)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Dana telah masuk ke e-wallet</div>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Penarikan Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">
            {formatRupiah(pendingWithdrawn)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Sedang diproses transfer admin</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Form Tarik Saldo</h3>
                    <p className="text-xs text-slate-500">Pencairan langsung ke e-wallet</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
                  <span className="text-blue-700 font-medium">Saldo kamu saat ini:</span>
                  <strong className="text-blue-900 font-extrabold text-sm">
                    {formatRupiah(userBalance)}
                  </strong>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Pilih Jumlah Penarikan
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-600">
                      7 Pilihan Nominal dari Admin
                    </span>
                  </div>

                  {/* 7 Nominal Pilihan Admin: 2k, 4k, 6k, 10k, 20k, 50k, 100k */}
                  <div className="grid grid-cols-4 gap-2">
                    {WITHDRAWAL_PRESETS.map((preset) => {
                      const isSelected = amount === preset.value;
                      const isAffordable = userBalance >= preset.value;

                      return (
                        <button
                          key={preset.value}
                          type="button"
                          disabled={!isAffordable}
                          onClick={() => {
                            setAmount(preset.value);
                            setFormError('');
                          }}
                          className={`relative p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-300 scale-[1.02]'
                              : isAffordable
                              ? 'bg-slate-50 hover:bg-blue-50/80 border-slate-200 text-slate-800 hover:border-blue-300'
                              : 'bg-slate-100/60 border-slate-200/50 text-slate-400 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <span className="text-sm font-black tracking-tight">{preset.label}</span>
                          <span
                            className={`text-[10px] font-semibold mt-0.5 ${
                              isSelected
                                ? 'text-blue-100'
                                : isAffordable
                                ? 'text-slate-500'
                                : 'text-slate-400'
                            }`}
                          >
                            {preset.text}
                          </span>
                          {!isAffordable && (
                            <span className="text-[9px] font-bold text-rose-500 mt-0.5">
                              Kurang
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Info Nominal Dipilih & Sisa Saldo */}
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Nominal Dipilih:</span>
                      <strong className="text-blue-700 font-extrabold text-sm">
                        {formatRupiah(amount)} ({WITHDRAWAL_PRESETS.find((p) => p.value === amount)?.label || ''})
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">Sisa Saldo:</span>
                      <strong
                        className={`font-bold ${
                          userBalance - amount < 0 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {formatRupiah(Math.max(0, userBalance - amount))}
                      </strong>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DANA', 'GoPay'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
                          method === m
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor Tujuan ({method})
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Penerima Akun {method}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap sesuai akun e-wallet"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={(e) => setIsConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>
                      Saya memastikan nomor dan nama pemilik akun {method} sudah benar. Kesalahan input nomor tujuan menjadi tanggung jawab pengguna.
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !isConfirmed}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Ajukan Tarik</span>
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
