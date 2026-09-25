import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Submission, SubmissionStatus, SubmissionType } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Globe,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RiwayatView() {
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semua' | SubmissionStatus>('Semua');
  const [typeFilter, setTypeFilter] = useState<'Semua' | SubmissionType>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSubForCheck, setSelectedSubForCheck] = useState<Submission | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Submission[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Submission, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Riwayat snapshot warning:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSubmissionType = (sub: Submission): SubmissionType => {
    if (sub.submissionType) return sub.submissionType;
    if (sub.rewardAmount === 2700) return 'bebas';
    return 'khusus';
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesFilter = activeFilter === 'Semua' || sub.status === activeFilter;
    const subType = getSubmissionType(sub);
    const matchesType = typeFilter === 'Semua' || subType === typeFilter;
    const cleanEmail = sub.dataContent.split('|')[0].trim().toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      sub.id.toLowerCase().includes(q) ||
      cleanEmail.includes(q) ||
      (sub.rejectionReason && sub.rejectionReason.toLowerCase().includes(q)) ||
      (sub.adminNotes && sub.adminNotes.toLowerCase().includes(q));

    return matchesFilter && matchesType && matchesSearch;
  });

  const countSemua = submissions.length;
  const countPending = submissions.filter((s) => s.status === 'Pending').length;
  const countCekAdmin = submissions.filter((s) => s.status === 'Cek Admin').length;
  const countDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const countDitolak = submissions.filter((s) => s.status === 'Ditolak').length;
  const countKhusus = submissions.filter((s) => getSubmissionType(s) === 'khusus').length;
  const countBebas = submissions.filter((s) => getSubmissionType(s) === 'bebas').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600" />
            <span>Riwayat Storan Akun Gmail</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau alur status pengecekan Gmail Anda: Pending → Cek Admin → Diterima/Ditolak
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Kategori Storan:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter('Semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'Semua'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Semua Jenis</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                typeFilter === 'Semua' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {countSemua}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('khusus')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'khusus'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gmail Khusus (3k)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                typeFilter === 'khusus' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {countKhusus}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('bebas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'bebas'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Gmail Bebas (2.7k)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                typeFilter === 'bebas' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
              }`}>
                {countBebas}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
            {(
              [
                { label: 'Semua Status', value: 'Semua', count: countSemua },
                { label: 'Pending', value: 'Pending', count: countPending },
                { label: 'Cek Admin', value: 'Cek Admin', count: countCekAdmin },
                { label: 'Diterima', value: 'Diterima', count: countDiterima },
                { label: 'Ditolak', value: 'Ditolak', count: countDitolak },
              ] as const
            ).map((tab) => {
              const isActive = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari email, ID, atau catatan..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs outline-none transition bg-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada data riwayat Gmail</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeFilter !== 'Semua' || typeFilter !== 'Semua'
              ? 'Tidak ditemukan data yang sesuai dengan filter atau kata kunci pencarian.'
              : 'Kamu belum memiliki riwayat storan akun Gmail. Mulai kirim di menu Storan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredSubmissions.map((sub) => {
            const subType = getSubmissionType(sub);
            const isKhusus = subType === 'khusus';
            const cleanEmail = sub.dataContent.split('|')[0].trim();

            return (
              <div
                key={sub.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-indigo-200 hover:shadow-md transition space-y-3 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">ID:</span>
                    <span className="font-mono text-xs font-bold text-slate-800">{sub.id}</span>
                    <button
                      onClick={() => copyToClipboard(sub.id)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                      title="Salin ID"
                    >
                      {copiedId === sub.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isKhusus
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200/70'
                          : 'bg-teal-100 text-teal-800 border border-teal-200/70'
                      }`}
                    >
                      {isKhusus ? <Sparkles className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      <span>{isKhusus ? 'Khusus (3k)' : 'Bebas (2.7k)'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        sub.status === 'Diterima'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sub.status === 'Ditolak'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : sub.status === 'Cek Admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {sub.status === 'Diterima' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {sub.status === 'Ditolak' && <XCircle className="w-3.5 h-3.5" />}
                      {sub.status === 'Cek Admin' && <Eye className="w-3.5 h-3.5" />}
                      {sub.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                      <span>{sub.status}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                      @
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {cleanEmail}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Password: <strong className="font-mono text-orange-600">{activePassword}</strong> · Imbalan: <strong className="text-indigo-700">{formatRupiah(sub.rewardAmount || (isKhusus ? 3000 : 2700))}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanEmail)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedId === cleanEmail ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Salin Akun</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSubForCheck(sub)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Cek Gmail & Status</span>
                    </button>
                  </div>
                </div>

                {sub.status === 'Pending' && (
                  <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><strong>Status Pending:</strong> Menunggu antrean pengecekan admin (tunggu 24-30 jam).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubForCheck(sub)}
                      className="text-amber-900 font-bold hover:underline shrink-0 text-[11px]"
                    >
                      Lihat Alur
                    </button>
                  </div>
                )}

                {sub.status === 'Cek Admin' && (
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span><strong>Sedang Dicek Admin:</strong> Akun ini sedang dalam proses pemeriksaan login dan validasi oleh administrator.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubForCheck(sub)}
                      className="text-blue-700 font-bold hover:underline shrink-0 text-[11px]"
                    >
                      Cek Detail
                    </button>
                  </div>
                )}

                {sub.status === 'Diterima' && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Berhasil Diterima:</strong> Akun valid dan saldo <strong>+{formatRupiah(sub.rewardAmount)}</strong> telah ditambahkan ke akun Anda.</span>
                    </div>
                    {sub.reviewedAt && (
                      <span className="text-[10px] text-emerald-800 font-semibold shrink-0">
                        {formatIndonesianDateTime(sub.reviewedAt)}
                      </span>
                    )}
                  </div>
                )}

                {sub.status === 'Ditolak' && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Storan Ditolak oleh Admin</span>
                    </div>
                    {sub.rejectionReason && (
                      <p className="text-rose-900 pl-6 text-xs leading-relaxed">
                        Alasan: <strong>{sub.rejectionReason}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CEK GMAIL & DETAIL ALUR PROSES */}
      <AnimatePresence>
        {selectedSubForCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Cek Status Akun Gmail
                    </h3>
                    <p className="text-xs text-slate-500">
                      Alur verifikasi: Pending → Cek Admin → Diterima/Ditolak
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubForCheck(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">
                    Alamat Gmail:
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      getSubmissionType(selectedSubForCheck) === 'khusus'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {getSubmissionType(selectedSubForCheck) === 'khusus'
                      ? 'Gmail Khusus (Rp 3.000)'
                      : 'Gmail Bebas (Rp 2.700)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900 break-all">
                    {selectedSubForCheck.dataContent.split('|')[0].trim()}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedSubForCheck.dataContent.split('|')[0].trim())}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                    title="Salin email"
                  >
                    {copiedId === selectedSubForCheck.dataContent.split('|')[0].trim() ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[11px] text-slate-400 block">Password Wajib</span>
                    <span className="font-mono font-bold text-orange-600">{activePassword}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[11px] text-slate-400 block">Nominal Imbalan</span>
                    <span className="font-bold text-indigo-700">
                      {formatRupiah(selectedSubForCheck.rewardAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Tahapan Verifikasi Akun:</span>
                </h4>

                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">1. Storan Diterima (Pending)</span>
                        <span className="text-[10px] text-slate-400">
                          {formatIndonesianDateTime(selectedSubForCheck.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Akun Gmail berhasil disetorkan dan masuk ke antrean verifikasi server.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${
                        selectedSubForCheck.status === 'Cek Admin'
                          ? 'bg-blue-600 text-white animate-pulse'
                          : selectedSubForCheck.status === 'Diterima' || selectedSubForCheck.status === 'Ditolak'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-100 text-amber-700 border border-amber-300'
                      }`}
                    >
                      {selectedSubForCheck.status === 'Cek Admin' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                      ) : selectedSubForCheck.status === 'Diterima' || selectedSubForCheck.status === 'Ditolak' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          selectedSubForCheck.status === 'Cek Admin'
                            ? 'text-blue-700 font-extrabold'
                            : 'text-slate-900'
                        }`}>
                          2. Pengecekan Admin
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {selectedSubForCheck.status === 'Cek Admin'
                            ? 'Sedang Berlangsung'
                            : selectedSubForCheck.checkedAt
                            ? formatIndonesianDateTime(selectedSubForCheck.checkedAt)
                            : selectedSubForCheck.status === 'Pending'
                            ? 'Menunggu Giliran (24-30 Jam)'
                            : 'Selesai Diperiksa'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedSubForCheck.status === 'Cek Admin'
                          ? 'Admin sedang login & memeriksa kesesuaian sandi serta fresh akun Anda.'
                          : selectedSubForCheck.status === 'Pending'
                          ? 'Akun berada dalam antrean pengecekan. Mohon tunggu proses pemeriksaan admin.'
                          : 'Pemeriksaan kualitas akun Gmail oleh tim admin telah selesai.'}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${
                        selectedSubForCheck.status === 'Diterima'
                          ? 'bg-emerald-600 text-white'
                          : selectedSubForCheck.status === 'Ditolak'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {selectedSubForCheck.status === 'Diterima' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : selectedSubForCheck.status === 'Ditolak' ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">3</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          selectedSubForCheck.status === 'Diterima'
                            ? 'text-emerald-700'
                            : selectedSubForCheck.status === 'Ditolak'
                            ? 'text-rose-700'
                            : 'text-slate-400'
                        }`}>
                          3. Keputusan Akhir ({selectedSubForCheck.status})
                        </span>
                        {selectedSubForCheck.reviewedAt && (
                          <span className="text-[10px] text-slate-400">
                            {formatIndonesianDateTime(selectedSubForCheck.reviewedAt)}
                          </span>
                        )}
                      </div>
                      {selectedSubForCheck.status === 'Diterima' && (
                        <div className="mt-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Akun Berhasil Diterima & Saldo Telah Masuk!</span>
                          </p>
                          <p className="text-emerald-800">
                            Imbalan sebesar <strong>{formatRupiah(selectedSubForCheck.rewardAmount)}</strong> telah otomatis ditambahkan ke saldo dompet Anda.
                          </p>
                        </div>
                      )}
                      {selectedSubForCheck.status === 'Ditolak' && (
                        <div className="mt-1.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-rose-800">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>Akun Tidak Lolos Verifikasi</span>
                          </p>
                          <p className="text-rose-900">
                            Alasan Penolakan: <strong>{selectedSubForCheck.rejectionReason || 'Tidak memenuhi ketentuan sistem'}</strong>
                          </p>
                        </div>
                      )}
                      {selectedSubForCheck.status !== 'Diterima' && selectedSubForCheck.status !== 'Ditolak' && (
                        <p className="text-xs text-slate-400 mt-0.5 italic">
                          Menunggu admin menyelesaikan verifikasi untuk menentukan status akhir.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedSubForCheck.adminNotes && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                  <div className="font-bold text-indigo-900">Catatan dari Admin:</div>
                  <p className="text-indigo-800 leading-relaxed">{selectedSubForCheck.adminNotes}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubForCheck(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  Tutup Tampilan Cek Gmail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
