import { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Settings,
  Save,
  Plus,
  Trash2,
  KeyRound,
  FileText,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

interface AdminSettingsTabProps {
  settings: SystemSettings;
  onSaveSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  savingSettings: boolean;
}

export function AdminSettingsTab({
  settings,
  onSaveSettings,
  savingSettings,
}: AdminSettingsTabProps) {
  const { showToast } = useToast();

  const [tempPrice, setTempPrice] = useState(settings.pricePerSubmission || 3000);
  const [tempMinWithdrawal, setTempMinWithdrawal] = useState(settings.minWithdrawal || 4000);
  const [tempSchedule, setTempSchedule] = useState(settings.storanSchedule || '');
  const [tempAnnouncement, setTempAnnouncement] = useState(settings.announcement || '');
  const [tempWhatsApp, setTempWhatsApp] = useState(settings.adminWhatsApp || '6285199219856');
  const [tempDailyGenerateLimit, setTempDailyGenerateLimit] = useState(settings.dailyGenerateLimit || 10);
  const [tempStoranClosedReason, setTempStoranClosedReason] = useState(settings.storanClosedReason || '');
  const [tempApkUrl, setTempApkUrl] = useState(settings.apkDownloadUrl || '');
  const [tempDanaOpen, setTempDanaOpen] = useState(settings.withdrawalDanaOpen !== false);
  const [tempGopayOpen, setTempGopayOpen] = useState(settings.withdrawalGopayOpen !== false);
  const [tempWithdrawalOpen, setTempWithdrawalOpen] = useState(settings.withdrawalOpen !== false);
  const [tempGeneratorOpen, setTempGeneratorOpen] = useState(settings.generatorOpen !== false);
  const [tempStoranOpen, setTempStoranOpen] = useState(settings.storanOpen !== false);

  // Password editing
  const [pw1, setPw1] = useState(settings.password1Name || 'zero1122');
  const [pw2, setPw2] = useState(settings.password2Name || 'prabujaya');
  const [tempPwZeroOpen, setTempPwZeroOpen] = useState(settings.passwordZero1122Open !== false);
  const [tempPwPrabuOpen, setTempPwPrabuOpen] = useState(settings.passwordPrabujayaOpen !== false);

  // Rules editing (beranda & STOR)
  const [rulesList, setRulesList] = useState<string[]>(
    Array.isArray(settings.rules) && settings.rules.length > 0 ? settings.rules : []
  );
  const [newRuleText, setNewRuleText] = useState('');

  useEffect(() => {
    setTempPrice(settings.pricePerSubmission || 3000);
    setTempMinWithdrawal(settings.minWithdrawal || 4000);
    setTempSchedule(settings.storanSchedule || '');
    setTempAnnouncement(settings.announcement || '');
    setTempWhatsApp(settings.adminWhatsApp || '6285199219856');
    setTempDailyGenerateLimit(settings.dailyGenerateLimit || 10);
    setTempStoranClosedReason(settings.storanClosedReason || '');
    setTempApkUrl(settings.apkDownloadUrl || '');
    setTempDanaOpen(settings.withdrawalDanaOpen !== false);
    setTempGopayOpen(settings.withdrawalGopayOpen !== false);
    setTempWithdrawalOpen(settings.withdrawalOpen !== false);
    setTempGeneratorOpen(settings.generatorOpen !== false);
    setTempStoranOpen(settings.storanOpen !== false);
    setPw1(settings.password1Name || 'zero1122');
    setPw2(settings.password2Name || 'prabujaya');
    setTempPwZeroOpen(settings.passwordZero1122Open !== false);
    setTempPwPrabuOpen(settings.passwordPrabujayaOpen !== false);
    if (Array.isArray(settings.rules)) {
      setRulesList(settings.rules);
    }
  }, [settings]);

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    setRulesList([...rulesList, newRuleText.trim()]);
    setNewRuleText('');
  };

  const handleDeleteRule = (index: number) => {
    const updated = rulesList.filter((_, i) => i !== index);
    setRulesList(updated);
  };

  const handleUpdateRule = (index: number, newText: string) => {
    const updated = [...rulesList];
    updated[index] = newText;
    setRulesList(updated);
  };

  const handleResetDefaultRules = () => {
    const defaults = [
      'Password akun Gmail dapat memilih password yang ditentukan admin.',
      'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor.',
      'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) yang menghambat admin.',
      'Kirimkan storan dalam format 1 baris untuk 1 akun Gmail.',
      'Gunakan fitur "Generate Akun" untuk kombinasi nama yang rapi.',
      'Dilarang mengirim email fiktif atau akun curian.',
      'Admin berhak menolak akun yang dinonaktifkan atau salah sandi.',
    ];
    setRulesList(defaults);
    showToast('info', 'Reset Rules', 'Daftar aturan dikembalikan ke default.');
  };

  const handleSave = async () => {
    if (!pw1.trim() && !pw2.trim()) {
      showToast('error', 'Gagal', 'Minimal satu password harus diisi.');
      return;
    }
    const cleanPw1 = pw1.trim() || 'zero1122';
    const cleanPw2 = pw2.trim() || 'prabujaya';
    const cleanedRules = rulesList.map((r) => r.trim()).filter((r) => r.length > 0);

    await onSaveSettings({
      pricePerSubmission: Math.max(0, Number(tempPrice) || 3000),
      minWithdrawal: Math.max(0, Number(tempMinWithdrawal) || 4000),
      storanSchedule: tempSchedule.trim(),
      announcement: tempAnnouncement.trim(),
      adminWhatsApp: tempWhatsApp.trim() || '6285199219856',
      dailyGenerateLimit: Math.max(1, Number(tempDailyGenerateLimit) || 10),
      storanClosedReason: tempStoranClosedReason.trim(),
      apkDownloadUrl: tempApkUrl.trim(),
      withdrawalOpen: tempWithdrawalOpen,
      withdrawalDanaOpen: tempDanaOpen,
      withdrawalGopayOpen: tempGopayOpen,
      generatorOpen: tempGeneratorOpen,
      storanOpen: tempStoranOpen,
      password1Name: cleanPw1,
      password2Name: cleanPw2,
      gmailDefaultPassword: cleanPw1,
      passwordZero1122Open: tempPwZeroOpen,
      passwordPrabujayaOpen: tempPwPrabuOpen,
      rules: cleanedRules.length > 0 ? cleanedRules : settings.rules,
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Pengaturan Sistem &amp; Layanan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Realtime Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit aturan Beranda &amp; STOR, pilihan password, harga komisi, dan parameter sistem.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={savingSettings}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {savingSettings ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </>
          )}
        </button>
      </div>

      {/* SAKLAR STATUS OPERASIONAL LAYANAN */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Saklar Operasional Layanan
            </h3>
            <p className="text-xs text-slate-500">
              Kendalikan status buka / tutup layanan: hijau jika buka, abu-abu jika tutup
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-1">
          {/* SAKLAR SEMUA STOR */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-800 block">Semua STOR</span>
              <span className="text-[10px] text-slate-500">Penerimaan akun storan baru</span>
            </div>
            <button
              type="button"
              onClick={() => setTempStoranOpen(!tempStoranOpen)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-between transition border cursor-pointer active:scale-95 shadow-xs ${
                tempStoranOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span>{tempStoranOpen ? 'BUKA' : 'TUTUP'}</span>
              <span className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${tempStoranOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>

          {/* SAKLAR SEMUA WD */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-800 block">Semua WD</span>
              <span className="text-[10px] text-slate-500">Penarikan semua e-wallet</span>
            </div>
            <button
              type="button"
              onClick={() => setTempWithdrawalOpen(!tempWithdrawalOpen)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-between transition border cursor-pointer active:scale-95 shadow-xs ${
                tempWithdrawalOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span>{tempWithdrawalOpen ? 'BUKA' : 'TUTUP'}</span>
              <span className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${tempWithdrawalOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>

          {/* SAKLAR WD DANA */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-800 block">Penarikan DANA</span>
              <span className="text-[10px] text-slate-500">Metode e-wallet DANA</span>
            </div>
            <button
              type="button"
              onClick={() => setTempDanaOpen(!tempDanaOpen)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-between transition border cursor-pointer active:scale-95 shadow-xs ${
                tempDanaOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span>{tempDanaOpen ? 'BUKA' : 'TUTUP'}</span>
              <span className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${tempDanaOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>

          {/* SAKLAR WD GOPAY */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-800 block">Penarikan GoPay</span>
              <span className="text-[10px] text-slate-500">Metode e-wallet GoPay</span>
            </div>
            <button
              type="button"
              onClick={() => setTempGopayOpen(!tempGopayOpen)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-between transition border cursor-pointer active:scale-95 shadow-xs ${
                tempGopayOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span>{tempGopayOpen ? 'BUKA' : 'TUTUP'}</span>
              <span className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${tempGopayOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>

          {/* SAKLAR GENERATOR */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-800 block">Generator Akun</span>
              <span className="text-[10px] text-slate-500">Fitur generator otomatis</span>
            </div>
            <button
              type="button"
              onClick={() => setTempGeneratorOpen(!tempGeneratorOpen)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-between transition border cursor-pointer active:scale-95 shadow-xs ${
                tempGeneratorOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span>{tempGeneratorOpen ? 'BUKA' : 'TUTUP'}</span>
              <span className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${tempGeneratorOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: EDIT PASSWORD STOR & BERANDA */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Edit Pilihan Password (STOR &amp; Beranda)
            </h3>
            <p className="text-xs text-slate-500">
              Ubah teks password dan aktifkan / tutup akses password untuk user
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* PASSWORD 1 */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-950 block">
                Password Pilihan 1:
              </label>
              <button
                type="button"
                onClick={() => setTempPwZeroOpen(!tempPwZeroOpen)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition border cursor-pointer flex items-center gap-2 shadow-xs ${
                  tempPwZeroOpen
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                    : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
                }`}
              >
                <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${tempPwZeroOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                </span>
                <span>{tempPwZeroOpen ? 'Status: BUKA' : 'Status: TUTUP'}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="Contoh: zero1122"
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 rounded-xl border border-amber-300 bg-white outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <p className="text-[10px] text-amber-900">
              Password default akun generator dan pilihan utama di form STOR.
            </p>
          </div>

          {/* PASSWORD 2 */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-blue-950 block">
                Password Pilihan 2:
              </label>
              <button
                type="button"
                onClick={() => setTempPwPrabuOpen(!tempPwPrabuOpen)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition border cursor-pointer flex items-center gap-2 shadow-xs ${
                  tempPwPrabuOpen
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                    : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
                }`}
              >
                <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${tempPwPrabuOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                </span>
                <span>{tempPwPrabuOpen ? 'Status: BUKA' : 'Status: TUTUP'}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Contoh: prabujaya"
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 rounded-xl border border-blue-300 bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[10px] text-blue-900">
              Pilihan password alternatif di dropdown menu STOR pengguna.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: EDIT RULES (BERANDA & STOR) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Edit Rules &amp; Ketentuan (Beranda &amp; STOR)
              </h3>
              <p className="text-xs text-slate-500">
                Aturan yang tampil di modal Syarat &amp; Ketentuan Beranda, menu STOR, dan halaman Rules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefaultRules}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>
        </div>

        {/* Input Tambah Rule Baru */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newRuleText}
            onChange={(e) => setNewRuleText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRule();
              }
            }}
            placeholder="Ketik poin aturan baru di sini..."
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={handleAddRule}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rule</span>
          </button>
        </div>

        {/* Daftar Rule Aktif */}
        <div className="space-y-2">
          {rulesList.map((rule, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5"
            >
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-black flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={rule}
                onChange={(e) => handleUpdateRule(idx, e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => handleDeleteRule(idx)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                title="Hapus Rule Ini"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: HARGA & PARAMETER LAINNYA */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <h3 className="text-sm sm:text-base font-black text-slate-900 pb-2 border-b border-slate-100">
          Parameter Operasional Lainnya
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <label className="text-xs font-black text-emerald-950 block">
              Harga Komisi per Akun Diterima (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={tempPrice}
              onChange={(e) => setTempPrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-emerald-300 bg-white"
            />
          </div>
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
            <label className="text-xs font-black text-blue-950 block">
              Minimal Penarikan Saldo (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={tempMinWithdrawal}
              onChange={(e) => setTempMinWithdrawal(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-blue-300 bg-white"
            />
          </div>
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
            <label className="text-xs font-black text-purple-950 block">
              Max Generate Akun (User / Hari)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={tempDailyGenerateLimit}
              onChange={(e) => setTempDailyGenerateLimit(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-purple-300 bg-white"
            />
            <p className="text-[10px] text-purple-800">
              Batas kuota generate harian yang didapat tiap freelancer dari stok admin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Jadwal &amp; Jam Operasional Layanan
            </label>
            <input
              type="text"
              value={tempSchedule}
              onChange={(e) => setTempSchedule(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nomor WhatsApp Resmi Admin
            </label>
            <input
              type="text"
              value={tempWhatsApp}
              onChange={(e) => setTempWhatsApp(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-mono bg-white"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-700 block">
            Pesan Pengumuman Beranda (Banner Beranda)
          </label>
          <textarea
            rows={3}
            value={tempAnnouncement}
            onChange={(e) => setTempAnnouncement(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-700 block">
            Pesan / Alasan Jika Storan Sedang Ditutup
          </label>
          <textarea
            rows={2}
            value={tempStoranClosedReason}
            onChange={(e) => setTempStoranClosedReason(e.target.value)}
            className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
