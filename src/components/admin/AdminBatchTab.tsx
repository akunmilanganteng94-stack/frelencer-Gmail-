import { useState, useMemo } from 'react';
import {
  Boxes,
  ClipboardCheck,
  ListCheck,
  ListX,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  Save,
} from 'lucide-react';
import { Submission, SystemSettings } from '../../types';
import { formatRupiah, formatIndonesianDateTime } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { getSubmissionStor, getCleanEmail } from './adminUtils';

interface AdminBatchTabProps {
  submissions: Submission[];
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  onOpenBulkCheckModal: (mode?: 'ALL' | 'zero1122' | 'prabujaya') => void;
  onOpenBulkConfirmModal: (mode?: 'ALL' | 'zero1122' | 'prabujaya') => void;
  onOpenBulkRejectModal: (mode?: 'ALL' | 'zero1122' | 'prabujaya') => void;
  onAcceptSubmission: (sub: Submission) => void;
  onCheckSubmission: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  onOpenDetailModal: (sub: Submission) => void;
  processingSubId: string | null;
}

type StatusFilterType = 'All' | 'Pending' | 'Cek Admin' | 'Diterima' | 'Ditolak';

export function AdminBatchTab({
  submissions,
  settings,
  onUpdateSettings,
  onOpenBulkCheckModal,
  onOpenBulkConfirmModal,
  onOpenBulkRejectModal,
  onAcceptSubmission,
  onCheckSubmission,
  onRejectSubmission,
  onOpenDetailModal,
  processingSubId,
}: AdminBatchTabProps) {
  const { showToast } = useToast();
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterType>('All');
  const [containerView, setContainerView] = useState<'both' | 'stor1' | 'stor2'>('both');

  // Internal access code inputs
  const [stor1Code, setStor1Code] = useState(settings.storanPassword1 || 'zero1122');
  const [stor2Code, setStor2Code] = useState(settings.storanPassword2 || 'prabujaya');

  const [searchStor1, setSearchStor1] = useState('');
  const [searchStor2, setSearchStor2] = useState('');

  // Segregated data - Never mixed
  const stor1All = useMemo(
    () => submissions.filter((s) => getSubmissionStor(s) === 'STOR 1'),
    [submissions]
  );
  const stor2All = useMemo(
    () => submissions.filter((s) => getSubmissionStor(s) === 'STOR 2'),
    [submissions]
  );

  const stor1Filtered = useMemo(() => {
    return stor1All.filter((sub) => {
      if (selectedStatusFilter !== 'All' && sub.status !== selectedStatusFilter) return false;
      const q = searchStor1.toLowerCase();
      if (!q) return true;
      const email = getCleanEmail(sub.dataContent).toLowerCase();
      const user = (sub.userName || '').toLowerCase();
      return email.includes(q) || user.includes(q) || sub.id.toLowerCase().includes(q);
    });
  }, [stor1All, selectedStatusFilter, searchStor1]);

  const stor2Filtered = useMemo(() => {
    return stor2All.filter((sub) => {
      if (selectedStatusFilter !== 'All' && sub.status !== selectedStatusFilter) return false;
      const q = searchStor2.toLowerCase();
      if (!q) return true;
      const email = getCleanEmail(sub.dataContent).toLowerCase();
      const user = (sub.userName || '').toLowerCase();
      return email.includes(q) || user.includes(q) || sub.id.toLowerCase().includes(q);
    });
  }, [stor2All, selectedStatusFilter, searchStor2]);

  const handleSaveStorCode = async (stor: 'STOR 1' | 'STOR 2') => {
    try {
      if (stor === 'STOR 1') {
        await onUpdateSettings({ storanPassword1: stor1Code.trim() });
        showToast('success', 'Kode Disimpan', `Kode internal STOR 1 diubah menjadi "${stor1Code.trim()}"`);
      } else {
        await onUpdateSettings({ storanPassword2: stor2Code.trim() });
        showToast('success', 'Kode Disimpan', `Kode internal STOR 2 diubah menjadi "${stor2Code.trim()}"`);
      }
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    }
  };

  const renderOrderTable = (
    list: Submission[],
    storLabel: string,
    searchVal: string,
    setSearchVal: (v: string) => void
  ) => {
    return (
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder={`Cari akun Gmail di ${storLabel}...`}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
            />
          </div>
          <span className="text-xs text-slate-500 font-bold">
            Menampilkan {list.length} order
          </span>
        </div>

        {list.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-400 text-xs">
            Tidak ada order di {storLabel} untuk filter ini
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID Order</th>
                  <th className="px-4 py-3">Akun Gmail Disetor</th>
                  <th className="px-4 py-3">Pengirim / Freelancer</th>
                  <th className="px-4 py-3">Waktu Masuk</th>
                  <th className="px-4 py-3">Imbalan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {list.map((sub) => {
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  const isProcessing = processingSubId === sub.id;
                  let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                  let statusTxt = 'Pending';
                  if (sub.status === 'Cek Admin') {
                    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                    statusTxt = 'Diproses';
                  } else if (sub.status === 'Diterima') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    statusTxt = 'Dikonfirmasi';
                  } else if (sub.status === 'Ditolak') {
                    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
                    statusTxt = 'Ditolak';
                  }

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        #{sub.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {cleanEmail}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {sub.userName || 'Freelancer'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                        {formatIndonesianDateTime(sub.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        {formatRupiah(sub.rewardAmount || 3000)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}`}>
                          {statusTxt}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(sub)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            Detail
                          </button>
                          {sub.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => onCheckSubmission(sub)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition cursor-pointer disabled:opacity-50"
                            >
                              Cek
                            </button>
                          )}
                          {sub.status !== 'Diterima' && (
                            <button
                              type="button"
                              onClick={() => onAcceptSubmission(sub)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                            >
                              Terima
                            </button>
                          )}
                          {sub.status !== 'Ditolak' && (
                            <button
                              type="button"
                              onClick={() => onRejectSubmission(sub)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition cursor-pointer disabled:opacity-50"
                            >
                              Tolak
                            </button>
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with 3 Bulk Buttons */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <Boxes className="w-3.5 h-3.5" />
            <span>Manajemen Batch &amp; Penjualan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Pemisahan Antrean Berdasarkan STOR
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Data STOR 1 dan STOR 2 terpisah dalam container masing-masing. Saklar operasional STOR terpusat pada 1 saklar buka/tutup.
          </p>
        </div>

        {/* 3 Tombol Bulk Gmail & 1 Saklar Buka/Tutup Tunggal + Saklar Per Password */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Master Switch Tunggal */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                storanOpen: settings.storanOpen === false ? true : false,
              })
            }
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-lg active:scale-95 border ${
              settings.storanOpen !== false
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400'
                : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
            }`}
            title="Saklar Utama STOR (1 Saklar untuk seluruh layanan stor)"
          >
            STOR: {settings.storanOpen !== false ? 'BUKA (1 SAKLAR)' : 'TUTUP (1 SAKLAR)'}
          </button>

          {/* Saklar Password 1 */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                storanPassword1Open: settings.storanPassword1Open === false ? true : false,
              })
            }
            className={`px-3 py-2 rounded-xl font-black text-[11px] transition cursor-pointer shadow-md active:scale-95 border ${
              settings.storanPassword1Open !== false
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Buka / Tutup Password 1 (zero1122)"
          >
            PW1 ({settings.storanPassword1 || 'zero1122'}): {settings.storanPassword1Open !== false ? 'BUKA' : 'TUTUP'}
          </button>

          {/* Saklar Password 2 */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                storanPassword2Open: settings.storanPassword2Open === false ? true : false,
              })
            }
            className={`px-3 py-2 rounded-xl font-black text-[11px] transition cursor-pointer shadow-md active:scale-95 border ${
              settings.storanPassword2Open !== false
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Buka / Tutup Password 2 (prabujaya)"
          >
            PW2 ({settings.storanPassword2 || 'prabujaya'}): {settings.storanPassword2Open !== false ? 'BUKA' : 'TUTUP'}
          </button>

          <button
            type="button"
            onClick={() => onOpenBulkCheckModal()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Bulk Cek Admin</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBulkConfirmModal()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-4 h-4" />
            <span>Konfirmasi Bulk Gmail</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBulkRejectModal()}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ListX className="w-4 h-4" />
            <span>Tolak Bulk Gmail</span>
          </button>
        </div>
      </div>

      {/* Filter Status Bar & Container Selector */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              { id: 'All', label: 'Semua Status' },
              { id: 'Pending', label: 'Pending', badgeClass: 'bg-amber-100 text-amber-800' },
              { id: 'Cek Admin', label: 'Diproses', badgeClass: 'bg-blue-100 text-blue-800' },
              { id: 'Diterima', label: 'Dikonfirmasi / Selesai', badgeClass: 'bg-emerald-100 text-emerald-800' },
              { id: 'Ditolak', label: 'Ditolak', badgeClass: 'bg-rose-100 text-rose-800' },
            ].map((tab) => {
              const isActive = selectedStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatusFilter(tab.id as StatusFilterType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* View Container Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setContainerView('both')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                containerView === 'both' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Semua Container
            </button>
            <button
              type="button"
              onClick={() => setContainerView('stor1')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                containerView === 'stor1' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              STOR 1 Saja
            </button>
            <button
              type="button"
              onClick={() => setContainerView('stor2')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                containerView === 'stor2' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
              }`}
            >
              STOR 2 Saja
            </button>
          </div>
        </div>
      </div>

      {/* CONTAINER STOR 1 */}
      {(containerView === 'both' || containerView === 'stor1') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200/90 shadow-2xs space-y-5">
          {/* Container 1 Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20 shrink-0">
                1
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    CONTAINER STOR 1
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      settings.storanOpen !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {settings.storanOpen !== false ? 'STATUS BUKA' : 'STATUS TUTUP'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Data antrean akun Gmail freelancer khusus jalur STOR 1.
                </p>
              </div>
            </div>

            {/* Editable Internal Access Code */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500">Kode Akses:</span>
                <input
                  type="text"
                  value={stor1Code}
                  onChange={(e) => setStor1Code(e.target.value)}
                  className="font-mono text-xs font-black text-blue-900 bg-transparent w-24 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveStorCode('STOR 1')}
                  className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                  title="Simpan Kode Internal STOR 1"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Metric Badges for STOR 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Order</span>
              <span className="font-mono font-black text-slate-900 text-lg">{stor1All.length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] text-amber-700 font-bold uppercase block">Pending</span>
              <span className="font-mono font-black text-amber-800 text-lg">
                {stor1All.filter((s) => s.status === 'Pending').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] text-blue-700 font-bold uppercase block">Diproses</span>
              <span className="font-mono font-black text-blue-800 text-lg">
                {stor1All.filter((s) => s.status === 'Cek Admin').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Selesai</span>
              <span className="font-mono font-black text-emerald-800 text-lg">
                {stor1All.filter((s) => s.status === 'Diterima').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-rose-700 font-bold uppercase block">Ditolak</span>
              <span className="font-mono font-black text-rose-800 text-lg">
                {stor1All.filter((s) => s.status === 'Ditolak').length}
              </span>
            </div>
          </div>

          {/* Table STOR 1 */}
          {renderOrderTable(stor1Filtered, 'STOR 1', searchStor1, setSearchStor1)}
        </div>
      )}

      {/* CONTAINER STOR 2 */}
      {(containerView === 'both' || containerView === 'stor2') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-200/90 shadow-2xs space-y-5">
          {/* Container 2 Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20 shrink-0">
                2
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    CONTAINER STOR 2
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      settings.storanOpen !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {settings.storanOpen !== false ? 'STATUS BUKA' : 'STATUS TUTUP'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Data antrean akun Gmail freelancer khusus jalur STOR 2.
                </p>
              </div>
            </div>

            {/* Editable Internal Access Code */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500">Kode Akses:</span>
                <input
                  type="text"
                  value={stor2Code}
                  onChange={(e) => setStor2Code(e.target.value)}
                  className="font-mono text-xs font-black text-indigo-900 bg-transparent w-24 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveStorCode('STOR 2')}
                  className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                  title="Simpan Kode Internal STOR 2"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Metric Badges for STOR 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Order</span>
              <span className="font-mono font-black text-slate-900 text-lg">{stor2All.length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] text-amber-700 font-bold uppercase block">Pending</span>
              <span className="font-mono font-black text-amber-800 text-lg">
                {stor2All.filter((s) => s.status === 'Pending').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] text-blue-700 font-bold uppercase block">Diproses</span>
              <span className="font-mono font-black text-blue-800 text-lg">
                {stor2All.filter((s) => s.status === 'Cek Admin').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Selesai</span>
              <span className="font-mono font-black text-emerald-800 text-lg">
                {stor2All.filter((s) => s.status === 'Diterima').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-rose-700 font-bold uppercase block">Ditolak</span>
              <span className="font-mono font-black text-rose-800 text-lg">
                {stor2All.filter((s) => s.status === 'Ditolak').length}
              </span>
            </div>
          </div>

          {/* Table STOR 2 */}
          {renderOrderTable(stor2Filtered, 'STOR 2', searchStor2, setSearchStor2)}
        </div>
      )}
    </div>
  );
}
