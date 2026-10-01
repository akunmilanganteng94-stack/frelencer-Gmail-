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
  Copy,
  Check,
  Calendar,
  Eye,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RiwayatView() {
  const { currentUser } = useAuth();
  const activePassword = 'sgsg1122';
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semua' | SubmissionStatus>('Semua');
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

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesFilter = activeFilter === 'Semua' || sub.status === activeFilter;
    const cleanEmail = sub.dataContent.split('|')[0].trim().toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      sub.id.toLowerCase().includes(q) ||
      cleanEmail.includes(q) ||
      (sub.rejectionReason && sub.rejectionReason.toLowerCase().includes(q)) ||
      (sub.adminNotes && sub.adminNotes.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const countSemua = submissions.length;
  const countPending = submissions.filter((s) => s.status === 'Pending').length;
  const countCekAdmin = submissions.filter((s) => s.status === 'Cek Admin').length;
  const countDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const countDitolak = submissions.filter((s) => s.status === 'Ditolak').length;

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span>Riwayat Storan Akun Gmail</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Pantau alur status pengecekan Gmail Anda: Pending &bull; Cek Admin &bull; Diterima / Ditolak
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { label: 'Semua Status', value: 'Semua', count: countSemua },
                { label: 'Pending', value: 'Pending', count: countPending },
                { label: 'Cek Status', value: 'Cek Admin', count: countCekAdmin },
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari email, ID, atau catatan..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none transition bg-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Tidak ada data riwayat Gmail</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeFilter !== 'Semua'
              ? 'Tidak ditemukan data yang sesuai dengan filter atau kata kunci pencarian.'
              : 'Kamu belum memiliki riwayat storan akun Gmail. Mulai kirim di menu Storan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {filteredSubmissions.map((sub) => {
            const cleanEmail = sub.dataContent.split('|')[0].trim();
            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 hover:border-blue-200 hover:shadow-2xs transition space-y-2 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">ID:</span>
                    <span className="font-mono text-xs font-bold text-slate-800">{sub.id}</span>
                    <button
                      onClick={() => copyToClipboard(sub.id)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition cursor-pointer"
                      title="Salin ID"
                    >
                      {copiedId === sub.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 ${
                        sub.status === 'Diterima'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sub.status === 'Ditolak'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : sub.status === 'Cek Admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {sub.status === 'Diterima' && <CheckCircle2 className="w-3 h-3" />}
                      {sub.status === 'Ditolak' && <XCircle className="w-3 h-3" />}
                      {sub.status === 'Cek Admin' && <Eye className="w-3 h-3" />}
                      {sub.status === 'Pending' && <Clock className="w-3 h-3" />}
                      <span>{sub.status === 'Cek Admin' ? 'Cek Status' : sub.status}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                      @
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {cleanEmail}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        PW: <strong className="font-mono text-orange-600">{activePassword}</strong> &bull; Imbalan: <strong className="text-blue-700">{formatRupiah(sub.rewardAmount || 3000)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanEmail)}
                      className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedId === cleanEmail ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Salin Akun</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubForCheck(sub)}
                      className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Cek Status</span>
                    </button>
                  </div>
                </div>

                {sub.status === 'Pending' && (
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span><strong>Status Pending:</strong> Menunggu antrean pengecekan admin (tunggu 24-30 jam).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubForCheck(sub)}
                      className="text-amber-900 font-bold hover:underline shrink-0 text-[10px] sm:text-[11px]"
                    >
                      Lihat Alur
                    </button>
                  </div>
                )}

                {sub.status === 'Cek Admin' && (
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span><strong>Sedang Dicek Admin:</strong> Akun sedang diperiksa login dan validasinya oleh admin.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubForCheck(sub)}
                      className="text-blue-700 font-bold hover:underline shrink-0 text-[10px] sm:text-[11px]"
                    >
                      Cek Detail
                    </button>
                  </div>
                )}

                {sub.status === 'Diterima' && (
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Berhasil Diterima:</strong> Akun valid, saldo <strong>+{formatRupiah(sub.rewardAmount)}</strong> telah masuk.</span>
                    </div>
                  </div>
                )}

                {sub.status === 'Ditolak' && (
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Storan Ditolak oleh Admin</span>
                    </div>
                    {sub.rejectionReason && (
                      <p className="text-rose-900 pl-5 text-[11px] leading-relaxed">
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

      {/* MODAL CEK GMAIL */}
      <AnimatePresence>
        {selectedSubForCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-5 space-y-3.5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Cek Status Akun Gmail
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Alur verifikasi: Pending &bull; Cek Admin &bull; Diterima / Ditolak
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubForCheck(null)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-xs block">
                  Alamat Gmail:
                </span>
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
                    <span className="font-bold text-blue-700">
                      {formatRupiah(selectedSubForCheck.rewardAmount)}
                    </span>
                  </div>
                </div>

                {/* TAHAPAN STATUS VERIFIKASI */}
                <div className="pt-2 space-y-2">
                  <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px] block">
                    Tahapan Status Pengecekan Akun:
                  </span>

                  <div className="space-y-2">
                    {/* 1. PENDING */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                        selectedSubForCheck.status === 'Pending'
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock
                          className={`w-4 h-4 shrink-0 ${
                            selectedSubForCheck.status === 'Pending'
                              ? 'text-amber-600 animate-spin'
                              : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <span className="text-xs font-bold block">1. Pending (Antrean Storan)</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Akun berhasil dikirim dan menunggu antrean pengecekan
                          </span>
                        </div>
                      </div>
                      {selectedSubForCheck.status === 'Pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 shrink-0">
                          Aktif Sekarang
                        </span>
                      )}
                    </div>

                    {/* 2. CEK STATUS / CEK ADMIN */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                        selectedSubForCheck.status === 'Cek Admin'
                          ? 'bg-blue-50/90 border-blue-300 text-blue-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Eye
                          className={`w-4 h-4 shrink-0 ${
                            selectedSubForCheck.status === 'Cek Admin'
                              ? 'text-blue-600 animate-pulse'
                              : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <span className="text-xs font-bold block">2. Cek Status (Sedang Dicek Admin)</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Akun sedang dalam proses pengujian login oleh admin
                          </span>
                        </div>
                      </div>
                      {selectedSubForCheck.status === 'Cek Admin' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-200 text-blue-900 shrink-0">
                          Sedang Dicek
                        </span>
                      )}
                    </div>

                    {/* 3. DITERIMA / DITOLAK */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                        selectedSubForCheck.status === 'Diterima'
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                          : selectedSubForCheck.status === 'Ditolak'
                          ? 'bg-rose-50/90 border-rose-300 text-rose-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedSubForCheck.status === 'Diterima' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : selectedSubForCheck.status === 'Ditolak' ? (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <span className="text-xs font-bold block">
                            3. {selectedSubForCheck.status === 'Ditolak' ? 'Ditolak (Gagal)' : 'Diterima (Selesai & Saldo Masuk)'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {selectedSubForCheck.status === 'Diterima'
                              ? `Saldo +${formatRupiah(selectedSubForCheck.rewardAmount)} telah masuk ke dompet Anda`
                              : selectedSubForCheck.status === 'Ditolak'
                              ? `Alasan: ${selectedSubForCheck.rejectionReason || 'Akun tidak memenuhi syarat'}`
                              : 'Hasil akhir verifikasi oleh admin'}
                          </span>
                        </div>
                      </div>
                      {(selectedSubForCheck.status === 'Diterima' || selectedSubForCheck.status === 'Ditolak') && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            selectedSubForCheck.status === 'Diterima'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          {selectedSubForCheck.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
