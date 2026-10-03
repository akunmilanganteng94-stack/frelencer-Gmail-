import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Wallet,
  Layers,
  Sparkles,
  Shield,
  Sliders,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  BookOpen,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { SystemSettings, Withdrawal } from '../../types';
import { formatRupiah, formatIndonesianDateTime } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { AdminWithdrawConfirmModal } from './AdminWithdrawConfirmModal';

interface AdminSettingsTabProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  withdrawals: Withdrawal[];
  onMarkWithdrawalPaid: (withItem: Withdrawal) => Promise<void>;
  onRejectWithdrawal: (withItem: Withdrawal) => void;
  processingWithId: string | null;
}

type SettingSubTab =
  | 'payout'
  | 'stor'
  | 'harga'
  | 'rules'
  | 'generator'
  | 'admin'
  | 'sistem';

export function AdminSettingsTab({
  settings,
  onUpdateSettings,
  withdrawals,
  onMarkWithdrawalPaid,
  onRejectWithdrawal,
  processingWithId,
}: AdminSettingsTabProps) {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<SettingSubTab>('payout');
  const [saving, setSaving] = useState(false);

  // Modal konfirmasi penarikan
  const [confirmWithdrawalItem, setConfirmWithdrawalItem] = useState<Withdrawal | null>(null);

  // Form states
  const [pricePerSubmission, setPricePerSubmission] = useState(settings.pricePerSubmission || 3000);
  const [minWithdrawal, setMinWithdrawal] = useState(settings.minWithdrawal || 4000);
  const [maxWithdrawal, setMaxWithdrawal] = useState(settings.maxWithdrawal || 1000000);
  const [withdrawalOpen, setWithdrawalOpen] = useState(settings.withdrawalOpen !== false);
  const [withdrawalDanaOpen, setWithdrawalDanaOpen] = useState(settings.withdrawalDanaOpen !== false);
  const [withdrawalGopayOpen, setWithdrawalGopayOpen] = useState(settings.withdrawalGopayOpen !== false);

  // 1 SAKLAR BUKA/TUTUP STOR TUNGGAL & SAKLAR PER PASSWORD
  const [storanOpen, setStoranOpen] = useState(settings.storanOpen !== false);
  const [storanPassword1Open, setStoranPassword1Open] = useState(settings.storanPassword1Open !== false);
  const [storanPassword2Open, setStoranPassword2Open] = useState(settings.storanPassword2Open !== false);
  const [storanPassword1, setStoranPassword1] = useState(settings.storanPassword1 || 'zero1122');
  const [storanPassword2, setStoranPassword2] = useState(settings.storanPassword2 || 'prabujaya');
  const [storanSchedule, setStoranSchedule] = useState(settings.storanSchedule || 'Senin - Jumat, 07.00 - 17.00 WIB');
  const [storanClosedReason, setStoranClosedReason] = useState(settings.storanClosedReason || '');
  const [defaultStor, setDefaultStor] = useState<'STOR 1' | 'STOR 2'>(settings.defaultStor || 'STOR 1');

  // Generator & Admin
  const [generatorOpen, setGeneratorOpen] = useState(settings.generatorOpen !== false);
  const [dailyGenerateLimit, setDailyGenerateLimit] = useState(settings.dailyGenerateLimit || 10);
  const [adminAccessCode, setAdminAccessCode] = useState(settings.adminAccessCode || 'admin123');
  const [adminWhatsApp, setAdminWhatsApp] = useState(settings.adminWhatsApp || '6285199219856');
  const [websiteStatus, setWebsiteStatus] = useState<'online' | 'maintenance' | 'operational'>(
    settings.websiteStatus || 'online'
  );
  const [announcement, setAnnouncement] = useState(settings.announcement || '');
  const [apkDownloadUrl, setApkDownloadUrl] = useState(settings.apkDownloadUrl || '');

  // RULES MANAGEMENT
  const [rulesList, setRulesList] = useState<string[]>(settings.rules || []);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [editingRuleText, setEditingRuleText] = useState('');

  // Payout tab filters
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'Pending' | 'Selesai' | 'Ditolak'>('all');
  const [payoutSearchQuery, setPayoutSearchQuery] = useState('');

  useEffect(() => {
    setPricePerSubmission(settings.pricePerSubmission || 3000);
    setMinWithdrawal(settings.minWithdrawal || 4000);
    setMaxWithdrawal(settings.maxWithdrawal || 1000000);
    setWithdrawalOpen(settings.withdrawalOpen !== false);
    setWithdrawalDanaOpen(settings.withdrawalDanaOpen !== false);
    setWithdrawalGopayOpen(settings.withdrawalGopayOpen !== false);
    setStoranOpen(settings.storanOpen !== false);
    setStoranPassword1Open(settings.storanPassword1Open !== false);
    setStoranPassword2Open(settings.storanPassword2Open !== false);
    setStoranPassword1(settings.storanPassword1 || 'zero1122');
    setStoranPassword2(settings.storanPassword2 || 'prabujaya');
    setStoranSchedule(settings.storanSchedule || 'Senin - Jumat, 07.00 - 17.00 WIB');
    setStoranClosedReason(settings.storanClosedReason || '');
    setDefaultStor(settings.defaultStor || 'STOR 1');
    setGeneratorOpen(settings.generatorOpen !== false);
    setDailyGenerateLimit(settings.dailyGenerateLimit || 10);
    setAdminAccessCode(settings.adminAccessCode || 'admin123');
    setAdminWhatsApp(settings.adminWhatsApp || '6285199219856');
    setWebsiteStatus(settings.websiteStatus || 'online');
    setAnnouncement(settings.announcement || '');
    setApkDownloadUrl(settings.apkDownloadUrl || '');
    if (settings.rules) setRulesList(settings.rules);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateSettings({
        pricePerSubmission: Number(pricePerSubmission) || 3000,
        minWithdrawal: Number(minWithdrawal) || 4000,
        maxWithdrawal: Number(maxWithdrawal) || 1000000,
        withdrawalOpen,
        withdrawalDanaOpen,
        withdrawalGopayOpen,
        storanOpen, // 1 saklar buka/tutup tunggal
        storanPassword1Open,
        storanPassword2Open,
        storanPassword1: storanPassword1.trim(),
        storanPassword2: storanPassword2.trim(),
        storanSchedule: storanSchedule.trim(),
        storanClosedReason: storanClosedReason.trim(),
        defaultStor,
        generatorOpen,
        dailyGenerateLimit: Number(dailyGenerateLimit) || 10,
        adminAccessCode: adminAccessCode.trim(),
        adminWhatsApp: adminWhatsApp.trim(),
        websiteStatus,
        announcement: announcement.trim(),
        apkDownloadUrl: apkDownloadUrl.trim(),
        rules: rulesList,
      });
      showToast('success', 'Tersimpan', 'Pengaturan berhasil diperbarui.');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Rule management handlers
  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setRulesList((prev) => [...prev, newRuleInput.trim()]);
    setNewRuleInput('');
    showToast('info', 'Rule Ditambahkan', 'Jangan lupa klik "Simpan Perubahan" untuk menyimpan ke cloud.');
  };

  const handleDeleteRule = (index: number) => {
    setRulesList((prev) => prev.filter((_, i) => i !== index));
    showToast('info', 'Rule Dihapus', 'Klik "Simpan Perubahan" untuk menyimpan.');
  };

  const handleStartEditRule = (index: number) => {
    setEditingRuleIndex(index);
    setEditingRuleText(rulesList[index]);
  };

  const handleSaveEditRule = () => {
    if (editingRuleIndex === null) return;
    if (!editingRuleText.trim()) return;
    setRulesList((prev) =>
      prev.map((r, i) => (i === editingRuleIndex ? editingRuleText.trim() : r))
    );
    setEditingRuleIndex(null);
    setEditingRuleText('');
    showToast('info', 'Rule Diubah', 'Klik "Simpan Perubahan" untuk menerapkan.');
  };

  const handleRestoreDefaultRules = () => {
    const defaults = [
      'Password akun Gmail WAJIB memilih salah satu: zero1122 atau prabujaya (sesuai pilihan saat stor).',
      'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor yang terkunci.',
      'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) atau kunci keamanan yang menghambat verifikasi admin.',
      'Kirimkan storan dalam sistem 1 baris untuk 1 akun Gmail (Format: email@gmail.com).',
      'Gunakan fitur "Generator Akun Gmail" untuk kombinasi nama dan alamat email yang rapi serta otomatis.',
      'Dilarang mengirim email fiktif, akun hasil retas/curian, atau akun yang belum terdaftar di Google.',
      'Admin berhak menolak akun yang gagal login, terkena disabled, atau tidak menggunakan password wajib.',
    ];
    setRulesList(defaults);
    showToast('info', 'Rules Direset', 'Rules dikembalikan ke bawaan standar.');
  };

  // Payout filtration
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (payoutStatusFilter !== 'all' && w.status !== payoutStatusFilter) return false;
      const q = payoutSearchQuery.toLowerCase().trim();
      if (!q) return true;
      const user = (w.userName || '').toLowerCase();
      const email = (w.userEmail || '').toLowerCase();
      const target = (w.targetNumber || '').toLowerCase();
      const recip = (w.recipientName || '').toLowerCase();
      return user.includes(q) || email.includes(q) || target.includes(q) || recip.includes(q);
    });
  }, [withdrawals, payoutStatusFilter, payoutSearchQuery]);

  const pendingWithdrawals = useMemo(() => withdrawals.filter((w) => w.status === 'Pending'), [withdrawals]);
  const completedWithdrawals = useMemo(() => withdrawals.filter((w) => w.status === 'Selesai'), [withdrawals]);
  const rejectedWithdrawals = useMemo(() => withdrawals.filter((w) => w.status === 'Ditolak'), [withdrawals]);

  const navItems: { id: SettingSubTab; label: string; icon: typeof DollarSign; badge?: number }[] = [
    { id: 'payout', label: 'Payout & Riwayat Penarikan', icon: Wallet, badge: pendingWithdrawals.length },
    { id: 'stor', label: 'Pengaturan STOR', icon: Layers },
    { id: 'harga', label: 'Harga Komisi', icon: DollarSign },
    { id: 'rules', label: 'Kelola Rules', icon: BookOpen },
    { id: 'generator', label: 'Generator', icon: Sparkles },
    { id: 'admin', label: 'Akses Admin', icon: Shield },
    { id: 'sistem', label: 'Sistem Website', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <Sliders className="w-3.5 h-3.5" />
            <span>Pengaturan Pusat AZYX19</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Konfigurasi &amp; Payouts
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Kelola konfirmasi penarikan, riwayat payout, saklar buka/tutup STOR tunggal, harga komisi, serta rules aplikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="relative z-10 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      {/* Sub-tabs bar */}
      <div className="bg-white rounded-3xl p-2 border border-slate-200/90 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-blue-900' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT TABS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-6">
        {/* 1. PAYOUT & RIWAYAT PENARIKAN (KONFIRMASI PENARIKAN + RIWAYAT LENGKAP) */}
        {subTab === 'payout' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Manajemen Payout &amp; Riwayat Penarikan Saldo
                </h3>
                <p className="text-xs text-slate-500">
                  Konfirmasi transfer saldo freelancer dan pantau seluruh riwayat pencairan e-wallet
                </p>
              </div>
            </div>

            {/* Metrik Payout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Pending Transfer
                </span>
                <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {pendingWithdrawals.length} Permohonan
                </div>
                <span className="text-[10px] text-amber-600 font-medium">Perlu dikonfirmasi transfer</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Berhasil Selesai
                </span>
                <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                  {completedWithdrawals.length} Transaksi
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Saldo telah terkirim</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Ditolak
                </span>
                <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                  {rejectedWithdrawals.length} Transaksi
                </div>
                <span className="text-[10px] text-rose-600 font-medium">Saldo dikembalikan ke user</span>
              </div>
            </div>

            {/* Pengaturan Batas Penarikan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Pengaturan Batas &amp; Saklar Penarikan:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Minimal Penarikan (Rp):</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Maksimal Penarikan (Rp):</label>
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    value={maxWithdrawal}
                    onChange={(e) => setMaxWithdrawal(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setWithdrawalOpen(!withdrawalOpen)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    withdrawalOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  Global: {withdrawalOpen ? 'BUKA' : 'TUTUP'}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawalDanaOpen(!withdrawalDanaOpen)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    withdrawalDanaOpen ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  DANA: {withdrawalDanaOpen ? 'BUKA' : 'TUTUP'}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawalGopayOpen(!withdrawalGopayOpen)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    withdrawalGopayOpen ? 'bg-indigo-50 text-indigo-800 border-indigo-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  GoPay: {withdrawalGopayOpen ? 'BUKA' : 'TUTUP'}
                </button>
              </div>
            </div>

            {/* Filter & Riwayat Tabel Penarikan */}
            <div className="space-y-3.5 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      payoutStatusFilter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Semua ({withdrawals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('Pending')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      payoutStatusFilter === 'Pending' ? 'bg-amber-500 text-slate-950 font-black shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Pending ({pendingWithdrawals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('Selesai')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      payoutStatusFilter === 'Selesai' ? 'bg-emerald-600 text-white font-black shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Selesai ({completedWithdrawals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('Ditolak')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      payoutStatusFilter === 'Ditolak' ? 'bg-rose-600 text-white font-black shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Ditolak ({rejectedWithdrawals.length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari user, no. e-wallet..."
                    value={payoutSearchQuery}
                    onChange={(e) => setPayoutSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none bg-white"
                  />
                </div>
              </div>

              {filteredWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  Tidak ada data penarikan pada kategori ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Freelancer</th>
                        <th className="px-4 py-3">Metode</th>
                        <th className="px-4 py-3">Nomor Tujuan</th>
                        <th className="px-4 py-3">Nama Rekening</th>
                        <th className="px-4 py-3">Nominal</th>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredWithdrawals.map((w) => {
                        const isPending = w.status === 'Pending';
                        return (
                          <tr key={w.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              <div>{w.userName || 'User'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{w.userEmail}</div>
                            </td>
                            <td className="px-4 py-3 font-black text-blue-700">{w.method}</td>
                            <td className="px-4 py-3 font-mono font-bold select-all">{w.targetNumber}</td>
                            <td className="px-4 py-3 font-medium uppercase">{w.recipientName}</td>
                            <td className="px-4 py-3 font-mono font-black text-emerald-700 text-sm">
                              {formatRupiah(w.amount)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                              {formatIndonesianDateTime(w.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                  w.status === 'Selesai'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : w.status === 'Ditolak'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {w.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmWithdrawalItem(w)}
                                    disabled={processingWithId === w.id}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition cursor-pointer active:scale-95"
                                  >
                                    Konfirmasi Bayar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRejectWithdrawal(w)}
                                    disabled={processingWithId === w.id}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer active:scale-95"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {w.completedAt ? formatIndonesianDateTime(w.completedAt) : 'Diproses'}
                                </span>
                              )}
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

        {/* 2. PENGATURAN STOR (1 SAKLAR BUKA/TUTUP TUNGGAL) */}
        {subTab === 'stor' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Pengaturan Layanan STOR Akun Gmail
              </h3>
              <p className="text-xs text-slate-500">
                Saklar buka/tutup tunggal untuk seluruh layanan storan akun
              </p>
            </div>

            {/* SAKLAR TUNGGAL UTAMA */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                  Saklar Tunggal Buka / Tutup Storan
                </span>
                <div className="text-lg font-black text-slate-900">
                  Status Storan: {storanOpen ? 'SEDANG DIBUKA' : 'SEDANG DITUTUP'}
                </div>
                <p className="text-xs text-slate-600 max-w-lg">
                  Saat dibuka, freelancer dapat langsung menyetor akun Gmail dengan memilih salah satu password (zero1122 atau prabujaya). Saat ditutup, seluruh formulir storan terkunci.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStoranOpen(!storanOpen)}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer shadow-md active:scale-95 shrink-0 ${
                  storanOpen
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                }`}
              >
                {storanOpen ? 'KLIK UNTUK TUTUP STOR' : 'KLIK UNTUK BUKA STOR'}
              </button>
            </div>

            {/* Password Storan & Saklar Per Password */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Pengaturan &amp; Saklar Buka/Tutup Per Password:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password 1 */}
                <div className={`p-4 rounded-2xl border transition space-y-3 ${
                  storanPassword1Open ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-80'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                        1
                      </span>
                      <span className="text-xs font-black text-slate-900">Password Pilihan 1</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStoranPassword1Open(!storanPassword1Open)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer border ${
                        storanPassword1Open
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }`}
                    >
                      {storanPassword1Open ? 'STATUS: BUKA' : 'STATUS: TUTUP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={storanPassword1}
                    onChange={(e) => setStoranPassword1(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
                    placeholder="zero1122"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Default: <code className="font-bold text-blue-700">zero1122</code></span>
                    <span>{storanPassword1Open ? '✓ Freelancer bisa pilih' : '✕ Dinonaktifkan'}</span>
                  </div>
                </div>

                {/* Password 2 */}
                <div className={`p-4 rounded-2xl border transition space-y-3 ${
                  storanPassword2Open ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-80'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        2
                      </span>
                      <span className="text-xs font-black text-slate-900">Password Pilihan 2</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStoranPassword2Open(!storanPassword2Open)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer border ${
                        storanPassword2Open
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }`}
                    >
                      {storanPassword2Open ? 'STATUS: BUKA' : 'STATUS: TUTUP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={storanPassword2}
                    onChange={(e) => setStoranPassword2(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
                    placeholder="prabujaya"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Default: <code className="font-bold text-indigo-700">prabujaya</code></span>
                    <span>{storanPassword2Open ? '✓ Freelancer bisa pilih' : '✕ Dinonaktifkan'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Jadwal & Alasan Penutupan */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Jadwal Operasional Layanan:</label>
                <input
                  type="text"
                  value={storanSchedule}
                  onChange={(e) => setStoranSchedule(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Pesan Alasan Jika STOR Ditutup:</label>
                <textarea
                  rows={2}
                  value={storanClosedReason}
                  onChange={(e) => setStoranClosedReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. PENGATURAN HARGA KOMISI (BONUS BULK DIHAPUS) */}
        {subTab === 'harga' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Pengaturan Harga &amp; Komisi Akun</h3>
              <p className="text-xs text-slate-500">Atur tarif komisi yang diterima freelancer per akun valid</p>
            </div>
            <div className="max-w-md p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
              <label className="text-xs font-black text-slate-900 block">
                Harga Komisi per Akun Gmail Valid (Rp):
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={pricePerSubmission}
                onChange={(e) => setPricePerSubmission(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-base font-black text-blue-900 rounded-xl border border-blue-300 bg-white"
              />
              <span className="text-[11px] text-slate-500 block leading-relaxed">
                Nominal saldo yang akan langsung dikreditkan ke dompet akun freelancer ketika order diterima admin.
              </span>
            </div>
          </div>
        )}

        {/* 4. KELOLA RULES APLIKASI (ADMIN BISA UBAH RULES) */}
        {subTab === 'rules' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900">Kelola Rules &amp; Ketentuan Storan</h3>
                <p className="text-xs text-slate-500">
                  Admin dapat menambah, mengedit, menghapus, atau mereset poin-poin peraturan platform
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreDefaultRules}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer self-start sm:self-center"
              >
                Reset ke Default
              </button>
            </div>

            {/* Input Tambah Rule Baru */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Tambah Aturan Baru:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik teks peraturan baru..."
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRule();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  disabled={!newRuleInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Daftar Rules Aktif */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Daftar Rules Aktif ({rulesList.length} Poin):</span>
                <span>Tampil di Halaman Rules &amp; Card Beranda</span>
              </div>

              {rulesList.map((rule, idx) => {
                const isEditing = editingRuleIndex === idx;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start justify-between gap-3 text-xs"
                  >
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <textarea
                          rows={2}
                          value={editingRuleText}
                          onChange={(e) => setEditingRuleText(e.target.value)}
                          className="flex-1 p-2 text-xs rounded-xl border border-blue-500 outline-none"
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEditRule}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Simpan Edit"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRuleIndex(null)}
                            className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-slate-800 font-medium leading-relaxed pt-0.5">
                          {rule}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditRule(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Aturan Ini"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Aturan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. PENGATURAN GENERATOR */}
        {subTab === 'generator' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Pengaturan Generator Akun Gmail</h3>
              <p className="text-xs text-slate-500">Saklar fitur generator dan batas kuota harian freelancer</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">Status Fitur Generator:</span>
                  <button
                    type="button"
                    onClick={() => setGeneratorOpen(!generatorOpen)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                      generatorOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {generatorOpen ? 'GENERATOR BUKA' : 'GENERATOR TUTUP'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Saat ditutup, freelancer tidak dapat men-generate alamat nama Gmail baru.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">
                  Limit Generate Harian per Freelancer (Akun/Hari):
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={dailyGenerateLimit}
                  onChange={(e) => setDailyGenerateLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-black text-slate-900 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. PENGATURAN AKSES ADMIN */}
        {subTab === 'admin' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Pengaturan Akses Admin &amp; Kontak</h3>
              <p className="text-xs text-slate-500">Ubah PIN akses dan kontak resmi administrator</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">Kode Akses / PIN Admin Internal:</label>
                <input
                  type="text"
                  value={adminAccessCode}
                  onChange={(e) => setAdminAccessCode(e.target.value)}
                  className="w-full px-3.5 py-2 font-mono text-sm font-black text-slate-900 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">WhatsApp Resmi Admin:</label>
                <input
                  type="text"
                  value={adminWhatsApp}
                  onChange={(e) => setAdminWhatsApp(e.target.value)}
                  className="w-full px-3.5 py-2 font-mono text-sm font-black text-slate-900 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* 7. PENGATURAN SISTEM WEBSITE */}
        {subTab === 'sistem' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Pengaturan Sistem &amp; Tampilan</h3>
              <p className="text-xs text-slate-500">Status operasional website dan pengumuman aplikasi</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">Status Operasional Website:</label>
                <select
                  value={websiteStatus}
                  onChange={(e) => setWebsiteStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                >
                  <option value="online">Online / Siap Menerima Storan</option>
                  <option value="operational">Jam Operasional Terbatas</option>
                  <option value="maintenance">Maintenance / Dalam Pemeliharaan</option>
                </select>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-black text-slate-900 block">STOR Default Saat User Buka:</label>
                <select
                  value={defaultStor}
                  onChange={(e) => setDefaultStor(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                >
                  <option value="STOR 1">STOR 1 (zero1122)</option>
                  <option value="STOR 2">STOR 2 (prabujaya)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Pengumuman Beranda (Banner Notifikasi):
              </label>
              <textarea
                rows={3}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Link Download Aplikasi Android (.APK):</label>
              <input
                type="url"
                value={apkDownloadUrl}
                onChange={(e) => setApkDownloadUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Bayar Penarikan */}
      <AdminWithdrawConfirmModal
        isOpen={Boolean(confirmWithdrawalItem)}
        onClose={() => setConfirmWithdrawalItem(null)}
        withdrawal={confirmWithdrawalItem}
        onConfirmPaid={async (w) => {
          await onMarkWithdrawalPaid(w);
          setConfirmWithdrawalItem(null);
        }}
        processing={Boolean(processingWithId)}
      />
    </div>
  );
}
