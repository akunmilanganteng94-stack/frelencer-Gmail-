import { useState } from 'react';
import { SystemSettings } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Sliders,
  Sparkles,
  Send,
  KeyRound,
  Wallet,
  CreditCard,
  CheckCircle2,
  XCircle,
  Power,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

interface AdminAllSaklarTabProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

export function AdminAllSaklarTab({ settings, onUpdateSettings }: AdminAllSaklarTabProps) {
  const { showToast } = useToast();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Status nilai masing-masing saklar
  const isGeneratorOpen = settings.generatorOpen !== false;
  const isStoranOpen = settings.storanOpen !== false;
  const isPw1Open = settings.storanPassword1Open !== false;
  const isPw2Open = settings.storanPassword2Open !== false;
  const isWithdrawalOpen = settings.withdrawalOpen !== false;
  const isDanaOpen = settings.withdrawalDanaOpen !== false;
  const isGopayOpen = settings.withdrawalGopayOpen !== false;
  const isMaintenance = settings.maintenanceMode === true;

  const pw1Name = settings.storanPassword1 || 'zero1122';
  const pw2Name = settings.storanPassword2 || 'prabujaya';

  // Hitung jumlah saklar yang sedang aktif
  const activeCount = [
    isGeneratorOpen,
    isStoranOpen,
    isPw1Open,
    isPw2Open,
    isWithdrawalOpen,
    isDanaOpen,
    isGopayOpen,
  ].filter(Boolean).length;

  // Toggle satu saklar
  const handleToggle = async (key: keyof SystemSettings, currentVal: boolean, label: string) => {
    setUpdatingKey(String(key));
    const nextVal = !currentVal;
    try {
      await onUpdateSettings({ [key]: nextVal });
      showToast(
        nextVal ? 'success' : 'info',
        `${label} Diubah`,
        `Status berhasil diubah menjadi: ${nextVal ? 'BUKA / AKTIF' : 'TUTUP / NONAKTIF'}`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Saklar', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingKey(null);
    }
  };

  // Buka semua saklar sekaligus
  const handleOpenAll = async () => {
    setUpdatingKey('ALL');
    try {
      await onUpdateSettings({
        generatorOpen: true,
        storanOpen: true,
        storanPassword1Open: true,
        storanPassword2Open: true,
        withdrawalOpen: true,
        withdrawalDanaOpen: true,
        withdrawalGopayOpen: true,
        maintenanceMode: false,
      });
      showToast('success', 'Semua Saklar Dibuka', 'Seluruh saklar generator, storan, password, dan penarikan kini AKTIF.');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingKey(null);
    }
  };

  // Tutup semua saklar operasional sekaligus
  const handleCloseAll = async () => {
    setUpdatingKey('ALL');
    try {
      await onUpdateSettings({
        generatorOpen: false,
        storanOpen: false,
        storanPassword1Open: false,
        storanPassword2Open: false,
        withdrawalOpen: false,
        withdrawalDanaOpen: false,
        withdrawalGopayOpen: false,
      });
      showToast('warning', 'Semua Saklar Ditutup', 'Seluruh saklar operasional kini DITUTUP sementara.');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Pusat Kendali All Saklar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <Sliders className="w-3.5 h-3.5" />
            <span>Pusat Kendali Fitur &amp; Operasional</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>All Saklar Terpusat</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 font-bold font-mono">
              {activeCount}/7 Aktif
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Semua saklar buka/tutup aplikasi terkumpul di sini: Generator Akun, Storan Utama, Saklar Password 1 &amp; 2, serta Saklar Penarikan Saldo (DANA &amp; GoPay).
          </p>
        </div>

        {/* Tombol Aksi Buka / Tutup Semua Saklar */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
          <button
            type="button"
            disabled={updatingKey !== null}
            onClick={handleOpenAll}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            <span>Buka Semua Saklar</span>
          </button>
          <button
            type="button"
            disabled={updatingKey !== null}
            onClick={handleCloseAll}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Tutup Semua Saklar</span>
          </button>
        </div>
      </div>

      {/* Grid Kartu Saklar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. SAKLAR GENERATOR AKUN GMAIL */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs space-y-3.5 ${
            isGeneratorOpen
              ? 'bg-gradient-to-br from-purple-50/70 via-white to-purple-50/40 border-purple-200'
              : 'bg-slate-50/90 border-slate-200 opacity-85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  isGeneratorOpen ? 'bg-purple-600 shadow-purple-500/20' : 'bg-slate-500'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Saklar Generator Akun
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Fitur generate kombinasi Gmail di halaman STOR
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shrink-0 ${
                isGeneratorOpen
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isGeneratorOpen ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
              <span>{isGeneratorOpen ? 'STATUS BUKA' : 'STATUS TUTUP'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Jika dibuka, freelancer dapat menekan tombol generate untuk mendapatkan rekomendasi nama akun Gmail baru. Jika ditutup, tombol generate terkunci.
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {isGeneratorOpen ? 'Freelancer diizinkan generate' : 'Fitur generate dinonaktifkan'}
            </span>
            <button
              type="button"
              disabled={updatingKey !== null}
              onClick={() => handleToggle('generatorOpen', isGeneratorOpen, 'Saklar Generator')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                isGeneratorOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isGeneratorOpen ? 'Klik Tutup Generator' : 'Klik Buka Generator'}
            </button>
          </div>
        </div>

        {/* 2. SAKLAR UTAMA STOR (1 SAKLAR MASTER) */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs space-y-3.5 ${
            isStoranOpen
              ? 'bg-gradient-to-br from-blue-50/70 via-white to-blue-50/40 border-blue-200'
              : 'bg-slate-50/90 border-slate-200 opacity-85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  isStoranOpen ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-500'
                }`}
              >
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Saklar Utama STOR (Master)
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  1 saklar pusat penerimaan seluruh storan akun
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shrink-0 ${
                isStoranOpen
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isStoranOpen ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
              <span>{isStoranOpen ? 'STATUS BUKA' : 'STATUS TUTUP'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Saklar induk untuk menerima pengiriman akun Gmail. Jika ditutup, seluruh formulir stor terkunci dan freelancer akan melihat pesan penutupan.
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {isStoranOpen ? 'Storan sedang aktif menerima akun' : 'Storan sedang ditutup total'}
            </span>
            <button
              type="button"
              disabled={updatingKey !== null}
              onClick={() => handleToggle('storanOpen', isStoranOpen, 'Saklar Utama STOR')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                isStoranOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isStoranOpen ? 'Klik Tutup Storan' : 'Klik Buka Storan'}
            </button>
          </div>
        </div>

        {/* 3. SAKLAR PASSWORD 1 */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs space-y-3.5 ${
            isPw1Open
              ? 'bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 border-indigo-200'
              : 'bg-slate-50/90 border-slate-200 opacity-85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  isPw1Open ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-500'
                }`}
              >
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Saklar Password 1 ({pw1Name})
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Jalur password pilihan 1 untuk storan
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shrink-0 ${
                isPw1Open
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isPw1Open ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
              <span>{isPw1Open ? 'BUKA' : 'TUTUP'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Jika dibuka, freelancer dapat memilih password <strong className="font-mono text-indigo-700">{pw1Name}</strong>. Jika ditutup, pilihan ini terkunci dan tombolnya bertuliskan (Tutup).
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {isPw1Open ? 'Password 1 aktif' : 'Password 1 dinonaktifkan'}
            </span>
            <button
              type="button"
              disabled={updatingKey !== null}
              onClick={() => handleToggle('storanPassword1Open', isPw1Open, `Saklar Password 1 (${pw1Name})`)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                isPw1Open
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isPw1Open ? `Tutup ${pw1Name}` : `Buka ${pw1Name}`}
            </button>
          </div>
        </div>

        {/* 4. SAKLAR PASSWORD 2 */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs space-y-3.5 ${
            isPw2Open
              ? 'bg-gradient-to-br from-blue-50/70 via-white to-blue-50/40 border-blue-200'
              : 'bg-slate-50/90 border-slate-200 opacity-85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  isPw2Open ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-500'
                }`}
              >
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Saklar Password 2 ({pw2Name})
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Jalur password pilihan 2 untuk storan
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shrink-0 ${
                isPw2Open
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isPw2Open ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
              <span>{isPw2Open ? 'BUKA' : 'TUTUP'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Jika dibuka, freelancer dapat memilih password <strong className="font-mono text-blue-700">{pw2Name}</strong>. Jika ditutup, pilihan ini terkunci dan tombolnya bertuliskan (Tutup).
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {isPw2Open ? 'Password 2 aktif' : 'Password 2 dinonaktifkan'}
            </span>
            <button
              type="button"
              disabled={updatingKey !== null}
              onClick={() => handleToggle('storanPassword2Open', isPw2Open, `Saklar Password 2 (${pw2Name})`)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                isPw2Open
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPw2Open ? `Tutup ${pw2Name}` : `Buka ${pw2Name}`}
            </button>
          </div>
        </div>

        {/* 5. SAKLAR PENARIKAN SALDO GLOBAL */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs space-y-3.5 ${
            isWithdrawalOpen
              ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 border-emerald-200'
              : 'bg-slate-50/90 border-slate-200 opacity-85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  isWithdrawalOpen ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-500'
                }`}
              >
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Saklar Penarikan Global
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Master saklar penarikan saldo freelancer
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shrink-0 ${
                isWithdrawalOpen
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isWithdrawalOpen ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
              <span>{isWithdrawalOpen ? 'BUKA' : 'TUTUP'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Jika dibuka, freelancer dapat melakukan permohonan penarikan saldo ke e-wallet. Jika ditutup, fitur penarikan terkunci global.
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {isWithdrawalOpen ? 'Penarikan saldo aktif' : 'Penarikan saldo ditutup'}
            </span>
            <button
              type="button"
              disabled={updatingKey !== null}
              onClick={() => handleToggle('withdrawalOpen', isWithdrawalOpen, 'Saklar Penarikan Global')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                isWithdrawalOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isWithdrawalOpen ? 'Tutup Penarikan' : 'Buka Penarikan'}
            </button>
          </div>
        </div>

        {/* 6 & 7. SAKLAR METODE E-WALLET (DANA & GOPAY) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-md shadow-slate-800/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Saklar Saluran E-Wallet
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 block">
                Buka/tutup masing-masing jalur transfer penarikan
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* DANA */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                isDanaOpen ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900">Jalur DANA</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    isDanaOpen
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {isDanaOpen ? 'BUKA' : 'TUTUP'}
                </span>
              </div>
              <button
                type="button"
                disabled={updatingKey !== null}
                onClick={() => handleToggle('withdrawalDanaOpen', isDanaOpen, 'Saklar DANA')}
                className={`w-full py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                  isDanaOpen ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {isDanaOpen ? 'Tutup Jalur DANA' : 'Buka Jalur DANA'}
              </button>
            </div>

            {/* GoPay */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                isGopayOpen ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900">Jalur GoPay</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    isGopayOpen
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {isGopayOpen ? 'BUKA' : 'TUTUP'}
                </span>
              </div>
              <button
                type="button"
                disabled={updatingKey !== null}
                onClick={() => handleToggle('withdrawalGopayOpen', isGopayOpen, 'Saklar GoPay')}
                className={`w-full py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                  isGopayOpen ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                }`}
              >
                {isGopayOpen ? 'Tutup Jalur GoPay' : 'Buka Jalur GoPay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
