import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
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
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RiwayatView() {
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semua' | SubmissionStatus>('Semua');
  const [activePwFilter, setActivePwFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSubForCheck, setSelectedSubForCheck] = useState<Submission | null>(null);

  const pw1 = settings.password1Name || 'zero1122';
  const pw2 = settings.password2Name || 'prabujaya';

  // Sync password filter if one is closed by admin
  useEffect(() => {
    if (activePwFilter === pw1 && settings.passwordZero1122Open === false) {
      setActivePwFilter('Semua');
    }
    if (activePwFilter === pw2 && settings.passwordPrabujayaOpen === false) {
      setActivePwFilter('Semua');
    }
  }, [settings.passwordZero1122Open, settings.passwordPrabujayaOpen, activePwFilter, pw1, pw2]);

  const getSubPw = (sub: Submission): string => {
    if (sub.passwordUsed) return sub.passwordUsed;
    if (sub.adminNotes && sub.adminNotes.includes('PW:')) {
      const match = sub.adminNotes.match(/PW:\s*([^\s,]+)/i);
      if (match && match[1]) return match[1];
    }
    const parts = sub.dataContent.split('|');
    if (parts[1] && parts[1].trim()) return parts[1].trim();
    return pw1;
  };

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

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesFilter = activeFilter === 'Semua' || sub.status === activeFilter;
      const pw = getSubPw(sub);
      const matchesPw = activePwFilter === 'Semua' || pw === activePwFilter;
      const cleanEmail = sub.dataContent.split('|')[0].trim().toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        sub.id.toLowerCase().includes(q) ||
        cleanEmail.includes(q) ||
        pw.toLowerCase().includes(q) ||
        (sub.rejectionReason && sub.rejectionReason.toLowerCase().includes(q)) ||
        (sub.adminNotes && sub.adminNotes.toLowerCase().includes(q));
      return matchesFilter && matchesPw && matchesSearch;
    });
  }, [submissions, activeFilter, activePwFilter, searchQuery]);

  const countSemua = submissions.length;
  const countPending = submissions.filter((s) => s.status === 'Pending').length;
  const countCekAdmin = submissions.filter((s) => s.status === 'Cek Admin').length;
  const countDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const countDitolak = submissions.filter((s) => s.status === 'Ditolak').length;
  const countPw1 = submissions.filter((s) => getSubPw(s) === pw1).length;
  const countPw2 = submissions.filter((s) => getSubPw(s) === pw2).length;

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-4xl mx-auto select-none pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span>Riwayat Storan Akun Gmail</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Daftar ringkas 1 akun per baris dengan tampilan waktu dan pemisahan password
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5">
        {/* Status filter tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
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

          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari email Gmail..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 text-xs outline-none transition bg-white"
            />
          </div>
        </div>

        {/* Pemisahan Kolom Password */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Password:</span>
          <button
            type="button"
            onClick={() => setActivePwFilter('Semua')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activePwFilter === 'Semua'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua PW ({countSemua})
          </button>
          {settings.passwordZero1122Open !== false && (
            <button
              type="button"
              onClick={() => setActivePwFilter(pw1)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                activePwFilter === pw1
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              {pw1} ({countPw1})
            </button>
          )}
          {settings.passwordPrabujayaOpen !== false && (
            <button
              type="button"
              onClick={() => setActivePwFilter(pw2)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                activePwFilter === pw2
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              {pw2} ({countPw2})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-11 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Tidak ada data riwayat Gmail</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeFilter !== 'Semua' || activePwFilter !== 'Semua'
              ? 'Tidak ditemukan data yang sesuai dengan filter atau kata kunci.'
              : 'Kamu belum memiliki riwayat storan akun Gmail. Mulai kirim di menu Storan.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 shadow-2xs space-y-1.5">
          {filteredSubmissions.map((sub) => {
            const cleanEmail = sub.dataContent.split('|')[0].trim();
            const pw = getSubPw(sub);
            return (
              <div
                key={sub.id}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200/70 transition flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold text-slate-900 truncate">
                    {cleanEmail}
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                    {pw}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      sub.status === 'Diterima'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'Ditolak'
                        ? 'bg-rose-100 text-rose-800'
                        : sub.status === 'Cek Admin'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {sub.status === 'Diterima' && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {sub.status === 'Ditolak' && <XCircle className="w-2.5 h-2.5" />}
                    {sub.status === 'Cek Admin' && <Eye className="w-2.5 h-2.5" />}
                    {sub.status === 'Pending' && <Clock className="w-2.5 h-2.5" />}
                    <span>{sub.status}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cleanEmail)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                    title="Salin Akun"
                  >
                    {copiedId === cleanEmail ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubForCheck(sub)}
                    className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                    title="Cek Detail"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT STOR */}
      <AnimatePresence>
        {selectedSubForCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-5 space-y-3.5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900">Detail Storan Gmail</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubForCheck(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-slate-400 text-[10px]">Alamat Gmail:</div>
                  <div className="font-mono text-sm font-black text-slate-900 select-all">
                    {selectedSubForCheck.dataContent.split('|')[0].trim()}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[11px] font-bold">
                      PW: {getSubPw(selectedSubForCheck)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">
                      Imbalan: {formatRupiah(selectedSubForCheck.rewardAmount || 3000)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block">Waktu Setor:</span>
                    <strong className="text-slate-800">
                      {formatIndonesianDateTime(selectedSubForCheck.createdAt)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block">Status Saat Ini:</span>
                    <strong
                      className={
                        selectedSubForCheck.status === 'Diterima'
                          ? 'text-emerald-700'
                          : selectedSubForCheck.status === 'Ditolak'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }
                    >
                      {selectedSubForCheck.status}
                    </strong>
                  </div>
                </div>

                {selectedSubForCheck.status === 'Ditolak' && selectedSubForCheck.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Alasan Penolakan:</span>
                    </div>
                    <p className="text-xs">{selectedSubForCheck.rejectionReason}</p>
                  </div>
                )}

                {selectedSubForCheck.adminNotes && (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900">
                    <span className="text-[10px] text-blue-700 font-bold block">Catatan Admin:</span>
                    <span className="font-mono text-xs">{selectedSubForCheck.adminNotes}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubForCheck(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
