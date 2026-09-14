import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Submission, SubmissionStatus } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';

export function RiwayatView() {
  const { currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semua' | SubmissionStatus>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesFilter = activeFilter === 'Semua' || sub.status === activeFilter;
    const matchesSearch =
      sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.dataContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.rejectionReason && sub.rejectionReason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const countSemua = submissions.length;
  const countPending = submissions.filter((s) => s.status === 'Pending').length;
  const countDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const countDitolak = submissions.filter((s) => s.status === 'Ditolak').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <FileText className="w-7 h-7 text-indigo-600" />
          <span>Riwayat Storan Akun Gmail</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Daftar seluruh akun Gmail yang telah kamu kirimkan beserta status verifikasinya
        </p>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
            {(
              [
                { label: 'Semua', value: 'Semua', count: countSemua },
                { label: 'Pending', value: 'Pending', count: countPending },
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
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
              placeholder="Cari ID atau isi data..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none transition bg-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada riwayat Gmail</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeFilter !== 'Semua'
              ? 'Tidak ditemukan data yang sesuai dengan filter atau kata kunci pencarian.'
              : 'Kamu belum memiliki riwayat pengiriman data. Mulai kirim data di menu Storan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-200 hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">ID:</span>
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
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      sub.status === 'Diterima'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : sub.status === 'Ditolak'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {sub.status === 'Diterima' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {sub.status === 'Ditolak' && <XCircle className="w-3.5 h-3.5" />}
                    {sub.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                    <span>{sub.status}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Storan:
                </span>
                <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-800 break-all border border-slate-100">
                  {sub.dataContent}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span>Nominal Storan:</span>
                  <span className="font-extrabold text-blue-700 text-sm">
                    {formatRupiah(sub.rewardAmount)}
                  </span>
                </div>
                {sub.reviewedAt && (
                  <span className="text-[11px] text-slate-400">
                    Diverifikasi pada: {formatIndonesianDateTime(sub.reviewedAt)}
                  </span>
                )}
              </div>

              {sub.status === 'Pending' && (
                <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 font-semibold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>dalam pengecekan admin tunggu 24-30 jam</span>
                </div>
              )}

              {sub.status === 'Ditolak' && sub.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Catatan Penolakan Admin:</div>
                    <p className="mt-0.5 leading-relaxed">{sub.rejectionReason}</p>
                  </div>
                </div>
              )}

              {sub.adminNotes && sub.status !== 'Ditolak' && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Catatan Admin:</div>
                    <p className="mt-0.5 leading-relaxed">{sub.adminNotes}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
