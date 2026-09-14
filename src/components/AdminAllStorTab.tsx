import { useState, useMemo } from 'react';
import { Submission } from '../types';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import {
  Mail,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Download,
  ListCheck,
  Layers,
} from 'lucide-react';

interface AdminAllStorTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  onOpenBulkConfirmModal: () => void;
  onAcceptSubmission: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  processingSubId: string | null;
}

export function AdminAllStorTab({
  submissions,
  defaultPassword = 'sgsg1122',
  onOpenBulkConfirmModal,
  onAcceptSubmission,
  onRejectSubmission,
  processingSubId,
}: AdminAllStorTabProps) {
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Diterima' | 'Ditolak'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const getCleanEmail = (content: string) => {
    if (!content) return '';
    return content.split('|')[0].trim();
  };

  const filteredList = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesStatus = filterStatus === 'All' || sub.status === filterStatus;
      const cleanEmail = getCleanEmail(sub.dataContent).toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        cleanEmail.includes(q) ||
        (sub.userName && sub.userName.toLowerCase().includes(q)) ||
        (sub.userEmail && sub.userEmail.toLowerCase().includes(q)) ||
        sub.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [submissions, filterStatus, searchQuery]);

  const pendingList = useMemo(() => submissions.filter((s) => s.status === 'Pending'), [submissions]);
  const acceptedList = useMemo(() => submissions.filter((s) => s.status === 'Diterima'), [submissions]);
  const rejectedList = useMemo(() => submissions.filter((s) => s.status === 'Ditolak'), [submissions]);

  const handleCopyEmails = (mode: 'pending_only' | 'current_filter' | 'all_lines' | 'with_details') => {
    let targetList: Submission[] = [];
    if (mode === 'pending_only') {
      targetList = pendingList;
    } else if (mode === 'current_filter') {
      targetList = filteredList;
    } else if (mode === 'all_lines') {
      targetList = submissions;
    } else if (mode === 'with_details') {
      targetList = filteredList;
    }

    if (targetList.length === 0) {
      showToast('warning', 'Tidak Ada Data', 'Tidak ada akun Gmail untuk disalin.');
      return;
    }

    let textToCopy = '';
    if (mode === 'with_details') {
      textToCopy = targetList
        .map(
          (s) =>
            `${getCleanEmail(s.dataContent)} | PW: ${defaultPassword} | Pengirim: ${s.userName} (${s.userEmail}) | Status: ${s.status}`
        )
        .join('\n');
    } else {
      textToCopy = targetList.map((s) => getCleanEmail(s.dataContent)).join('\n');
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedMode(mode);
    showToast(
      'success',
      'Semua STOR-an Berhasil Disalin',
      `${targetList.length} akun Gmail berhasil disalin (1 baris 1 akun).`
    );
    setTimeout(() => setCopiedMode(null), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: All STOR User Feature & Quick Stats */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-blue-200 border border-white/20">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Fitur Manajemen: All STOR User</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Semua Gmail STOR-an User
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Pusat seluruh akun Gmail yang disetor freelancer. Salin daftar akun untuk pengecekan, lalu konfirmasi terima secara bulk (massal) dengan menempel daftar akun 1 baris 1 akun.
          </p>
        </div>

        {/* Big Action: Konfirmasi Terima Bulk */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenBulkConfirmModal}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-5 h-5" />
            <span>Konfirmasi Terima Bulk</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Semua Storan</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{submissions.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Akun disetor pengguna</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Pending (Belum Diperiksa)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingList.length}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">Menunggu konfirmasi</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Diterima (Sudah Valid)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{acceptedList.length}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Saldo telah diberikan</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Ditolak</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{rejectedList.length}</div>
          <div className="text-[11px] text-rose-500 mt-0.5">Tidak valid / error</div>
        </div>
      </div>

      {/* Control Bar: Salin Semua STOR-an + Filter & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-indigo-950">
                Fitur Salin Semua STOR-an User:
              </div>
              <div className="text-[11px] text-indigo-700">
                Salin daftar alamat Gmail sekaligus (format 1 baris 1 akun) untuk memudahkan pengecekan
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyEmails('pending_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copiedMode === 'pending_only'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {copiedMode === 'pending_only' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>Salin Pending ({pendingList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyEmails('current_filter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copiedMode === 'current_filter'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copiedMode === 'current_filter' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Salin Semua ({filteredList.length} Akun)</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyEmails('with_details')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Salin lengkap dengan nama user, status, dan password"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Detail Lengkap</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'All', label: `Semua (${submissions.length})` },
              { id: 'Pending', label: `Pending (${pendingList.length})` },
              { id: 'Diterima', label: `Diterima (${acceptedList.length})` },
              { id: 'Ditolak', label: `Ditolak (${rejectedList.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari email Gmail, user, email..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table: All Gmail STOR-an User */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Mail className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Tidak ada data storan akun Gmail</p>
            <p className="text-slate-500">
              {searchQuery
                ? `Tidak ditemukan akun yang cocok dengan kata kunci "${searchQuery}".`
                : 'Belum ada akun Gmail yang dikirimkan oleh pengguna.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">#</th>
                  <th className="px-5 py-3.5">Akun Gmail Disetor</th>
                  <th className="px-5 py-3.5">User Pengirim</th>
                  <th className="px-5 py-3.5">Waktu Storan</th>
                  <th className="px-5 py-3.5">Imbalan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((sub, idx) => {
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  const isPending = sub.status === 'Pending';
                  const isAccepted = sub.status === 'Diterima';
                  const isRejected = sub.status === 'Ditolak';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-mono font-bold text-slate-900 select-all">
                            {cleanEmail}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cleanEmail);
                              showToast('info', 'Email Disalin', cleanEmail);
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                            title="Salin Email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {sub.dataContent.includes('|') && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Raw: {sub.dataContent}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{sub.userName || 'Freelancer'}</div>
                        <div className="text-[11px] text-slate-400">{sub.userEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {formatIndonesianDateTime(sub.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-blue-700">
                        {formatRupiah(sub.rewardAmount || 3000)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            isAccepted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isAccepted && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {isRejected && <XCircle className="w-3.5 h-3.5" />}
                          {isPending && <Clock className="w-3.5 h-3.5" />}
                          <span>{sub.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => onRejectSubmission(sub)}
                                disabled={processingSubId === sub.id}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer"
                              >
                                Tolak
                              </button>
                              <button
                                type="button"
                                onClick={() => onAcceptSubmission(sub)}
                                disabled={processingSubId === sub.id}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Terima</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${cleanEmail}|${defaultPassword}`
                              );
                              showToast('info', 'Disalin', `${cleanEmail}|${defaultPassword}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Salin Format Email|Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
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
  );
}
