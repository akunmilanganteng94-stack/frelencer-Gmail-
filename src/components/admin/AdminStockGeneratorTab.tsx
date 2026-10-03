import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  Check,
  X,
  Layers,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { GmailStockItem, SystemSettings } from '../../types';
import { useGmailStock } from '../../hooks/useGmailStock';
import { useToast } from '../../context/ToastContext';
import { formatIndonesianDateTime } from '../../lib/utils';

interface AdminStockGeneratorTabProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

export function AdminStockGeneratorTab({
  settings,
  onUpdateSettings,
}: AdminStockGeneratorTabProps) {
  const { showToast } = useToast();
  const {
    stock,
    availableStock,
    usedStock,
    loading,
    addSingleAccount,
    addBulkAccounts,
    updateAccount,
    deleteAccount,
    clearUsedAccounts,
    clearAllStock,
    replenishStock,
    resetAllUsedToAvailable,
  } = useGmailStock();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [showAddBulkModal, setShowAddBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmClearModal, setShowConfirmClearModal] = useState<'used' | 'all' | null>(null);

  // Form states
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePassword, setSinglePassword] = useState('zero1122');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkDefaultPass, setBulkDefaultPass] = useState('zero1122');
  const [editingItem, setEditingItem] = useState<GmailStockItem | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState<'available' | 'used'>('available');

  const [submitting, setSubmitting] = useState(false);

  // Filtered accounts
  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      if (statusFilter === 'available' && item.status !== 'available') return false;
      if (statusFilter === 'used' && item.status !== 'used') return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const email = item.email.toLowerCase();
      const claimedName = (item.claimedByName || '').toLowerCase();
      const claimedEmail = (item.claimedByEmail || '').toLowerCase();
      return email.includes(q) || claimedName.includes(q) || claimedEmail.includes(q);
    });
  }, [stock, statusFilter, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('info', 'Tersalin', `${text} disalin.`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAllVisible = () => {
    if (filteredStock.length === 0) {
      showToast('info', 'Kosong', 'Tidak ada akun untuk disalin.');
      return;
    }
    const text = filteredStock.map((s) => `${s.email}|${s.password || 'zero1122'}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('success', 'Disalin', `${filteredStock.length} akun disalin (format: email|password).`);
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;
    setSubmitting(true);
    try {
      await addSingleAccount(singleEmail.trim(), singlePassword.trim() || 'zero1122');
      showToast('success', 'Berhasil', `Akun ${singleEmail.trim()} berhasil ditambahkan ke stok.`);
      setSingleEmail('');
      setShowAddSingleModal(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    setSubmitting(true);
    try {
      const added = await addBulkAccounts(bulkInput, bulkDefaultPass.trim() || 'zero1122');
      showToast('success', 'Stok Massal Berhasil', `${added} akun Gmail berhasil dimasukkan ke stok generator.`);
      setBulkInput('');
      setShowAddBulkModal(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: GmailStockItem) => {
    setEditingItem(item);
    setEditEmail(item.email);
    setEditPassword(item.password || 'zero1122');
    setEditStatus(item.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editEmail.trim()) return;
    setSubmitting(true);
    try {
      await updateAccount(editingItem.id, {
        email: editEmail.trim(),
        password: editPassword.trim(),
        status: editStatus,
      });
      showToast('success', 'Berhasil Diperbarui', `Akun ${editEmail.trim()} berhasil diedit.`);
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: GmailStockItem) => {
    try {
      await deleteAccount(item.id);
      showToast('info', 'Dihapus', `Akun ${item.email} telah dihapus dari stok generator.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    }
  };

  const handleClearUsed = async () => {
    setSubmitting(true);
    try {
      await clearUsedAccounts();
      showToast('success', 'Dibersihkan', 'Seluruh stok berstatus Terpakai (Used) telah dihapus.');
      setShowConfirmClearModal(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearAll = async () => {
    setSubmitting(true);
    try {
      await clearAllStock();
      showToast('success', 'Stok Dikosongkan', 'Semua stok akun generator telah dihapus.');
      setShowConfirmClearModal(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoReplenish = async () => {
    setSubmitting(true);
    try {
      const added = await replenishStock(50, 'zero1122');
      showToast('success', 'Generate Otomatis', `${added} akun Gmail segar berhasil digenerate ke stok.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetUsed = async () => {
    setSubmitting(true);
    try {
      const resetCount = await resetAllUsedToAvailable();
      showToast('success', 'Reset Status', `${resetCount} akun terpakai dikembalikan ke status Tersedia.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Stok Generator Akun Gmail</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Kelola Stok Akun Generator
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Admin dapat menambah, mengedit, menghapus, serta melihat seluruh akun yang siap digenerate oleh freelancer.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddSingleModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah 1 Akun</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddBulkModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Tambah Bulk (Banyak)</span>
          </button>
          <button
            type="button"
            onClick={handleAutoReplenish}
            disabled={submitting}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Generate otomatis 50 akun Gmail fresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
            <span>Auto +50 Stok</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Semua Stok</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {loading ? '-' : stock.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Akun di database generator</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-2xs space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Stok Tersedia (Ready)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
            {loading ? '-' : availableStock.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">Siap diambil freelancer saat generate</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Stok Sudah Diklaim (Used)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            {loading ? '-' : usedStock.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Telah digenerate oleh user</div>
        </div>
      </div>

      {/* Control Actions & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Semua ({stock.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('available')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'available' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Tersedia ({availableStock.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('used')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'used' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Terpakai ({usedStock.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyAllVisible}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Tampilan ({filteredStock.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari alamat email, nama user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
            />
          </div>
        </div>

        {/* Maintenance Actions Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {usedStock.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleResetUsed}
                  disabled={submitting}
                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition cursor-pointer"
                >
                  Reset Status Digunakan &rarr; Tersedia ({usedStock.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClearModal('used')}
                  className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 transition cursor-pointer"
                >
                  Hapus Stok Terpakai ({usedStock.length})
                </button>
              </>
            )}
          </div>
          {stock.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmClearModal('all')}
              className="px-3 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold border border-rose-200 transition cursor-pointer"
            >
              Kosongkan Semua Stok ({stock.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">
            Daftar Stok Akun ({filteredStock.length})
          </h3>
          <span className="text-xs text-slate-500 font-bold">
            Admin bisa mengedit, menghapus, atau menambah stok akun di sini
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Tidak ada stok yang sesuai</p>
            <p className="text-slate-500">
              {searchQuery
                ? `Tidak ditemukan akun dengan kata kunci "${searchQuery}".`
                : 'Stok kosong. Klik tombol "+ Tambah 1 Akun" atau "Tambah Bulk" di atas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Alamat Gmail</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">User Pengklaim</th>
                  <th className="px-4 py-3">Waktu Ditambahkan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStock.map((item, idx) => {
                  const isAvailable = item.status === 'available';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.email}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.email, item.id)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 transition"
                            title="Salin Email"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-800">
                        {item.password || 'zero1122'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isAvailable ? 'Tersedia' : 'Terpakai'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.claimedByName || item.claimedByEmail ? (
                          <div>
                            <div className="font-bold text-slate-800">{item.claimedByName || 'User'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.claimedByEmail}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum diklaim</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {formatIndonesianDateTime(item.addedAt || new Date().toISOString())}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                            title="Edit Akun Ini"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
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

      {/* Modal Tambah 1 Akun */}
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
                <h3 className="text-base font-bold text-slate-900">Tambah 1 Akun ke Stok Generator</h3>
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSingle} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Alamat Gmail:</label>
                  <input
                    type="email"
                    required
                    placeholder="contoh.nama123@gmail.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Password Akun:</label>
                  <input
                    type="text"
                    required
                    value={singlePassword}
                    onChange={(e) => setSinglePassword(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Default: zero1122</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSingleModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Tambah ke Stok'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Tambah Bulk */}
      <AnimatePresence>
        {showAddBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Tambah Banyak Akun Gmail (Bulk)</h3>
                <button
                  type="button"
                  onClick={() => setShowAddBulkModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBulk} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Default Password Jika Tidak Ditentukan:</label>
                  <input
                    type="text"
                    value={bulkDefaultPass}
                    onChange={(e) => setBulkDefaultPass(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Daftar Akun (1 Baris = 1 Akun, format email atau email|password):
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder={`budi.santoso123@gmail.com\ndimas.wijaya456@gmail.com|zero1122\nsiti.rahma789@gmail.com`}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 bg-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBulkModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Semua Stok'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edit Akun */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Edit Akun Stok Generator</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Alamat Gmail:</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Password:</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Status Ketersediaan:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="available">Tersedia (Ready di Generator)</option>
                    <option value="used">Sudah Terpakai (Claimed by User)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus Digunakan / Semua */}
      <AnimatePresence>
        {showConfirmClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {showConfirmClearModal === 'used'
                    ? 'Hapus Semua Stok Terpakai?'
                    : 'Kosongkan Seluruh Stok?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {showConfirmClearModal === 'used'
                    ? `Sebanyak ${usedStock.length} akun yang telah diklaim akan dihapus permanen dari database.`
                    : `Semua ${stock.length} akun generator akan dihapus total. Anda dapat menambahkan kembali kapan saja.`}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClearModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={showConfirmClearModal === 'used' ? handleClearUsed : handleClearAll}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
