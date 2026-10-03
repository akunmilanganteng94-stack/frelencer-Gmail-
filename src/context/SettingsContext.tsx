import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SystemSettings } from '../types';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { notifyDataChange, subscribeDataChange } from '../lib/syncHelper';

const DEFAULT_PASSWORD_1 = 'zero1122';
const DEFAULT_PASSWORD_2 = 'prabujaya';

const DEFAULT_RULES = [
  'Password akun Gmail WAJIB memilih salah satu: zero1122 atau prabujaya (sesuai pilihan saat stor).',
  'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor yang terkunci.',
  'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) atau kunci keamanan yang menghambat verifikasi admin.',
  'Kirimkan storan dalam sistem 1 baris untuk 1 akun Gmail (Format: email@gmail.com).',
  'Gunakan fitur "Generator Akun Gmail" untuk kombinasi nama dan alamat email yang rapi serta otomatis.',
  'Dilarang mengirim email fiktif, akun hasil retas/curian, atau akun yang belum terdaftar di Google.',
  'Admin berhak menolak akun yang gagal login, terkena disabled, atau tidak menggunakan password wajib.',
];

const DEFAULT_SETTINGS: SystemSettings = {
  storanOpen: true, // 1 saklar buka/tutup stor tunggal
  storanPassword1: DEFAULT_PASSWORD_1,
  storanPassword2: DEFAULT_PASSWORD_2,
  storanPassword1Open: true, // Saklar buka/tutup password 1
  storanPassword2Open: true, // Saklar buka/tutup password 2
  storanSchedule: 'Senin - Jumat, 07.00 - 17.00 WIB (Sabtu & Minggu CLOSE)',
  pricePerSubmission: 3000,
  withdrawalOpen: true,
  withdrawalDanaOpen: true,
  withdrawalGopayOpen: true,
  minWithdrawal: 4000,
  maxWithdrawal: 1000000,
  maintenanceMode: false,
  websiteStatus: 'online',
  adminAccessCode: 'admin123',
  defaultStor: 'STOR 1',
  rules: DEFAULT_RULES,
  announcement:
    'Storan Akun Gmail OPEN setiap Senin - Jumat!\nJam operasional: 07.00 - 17.00 WIB\nPilihan Password wajib: zero1122 atau prabujaya\nPastikan akun fresh dan tidak mengaktifkan 2FA.',
  gmailDefaultPassword: 'zero1122 / prabujaya',
  generatorOpen: true,
  adminWhatsApp: '6285199219856',
  dailyGenerateLimit: 10,
  storanClosedReason:
    'Admin sedang menutup penerimaan akun baru. Storan aktif setiap Senin - Jumat. Silakan kembali pada jam operasional.',
  apkDownloadUrl: 'https://www.mediafire.com/file/35mid43yhsc7itc/Azgmail.apk/file',
};

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const cached = localStorage.getItem('azgmail_cached_settings');
      return cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<SystemSettings>;
          const updated: SystemSettings = {
            ...DEFAULT_SETTINGS,
            ...data,
            storanOpen: data.storanOpen !== undefined ? data.storanOpen : true,
            storanPassword1: data.storanPassword1 || DEFAULT_PASSWORD_1,
            storanPassword2: data.storanPassword2 || DEFAULT_PASSWORD_2,
            storanPassword1Open: data.storanPassword1Open !== undefined ? data.storanPassword1Open : true,
            storanPassword2Open: data.storanPassword2Open !== undefined ? data.storanPassword2Open : true,
            withdrawalOpen: data.withdrawalOpen !== undefined ? data.withdrawalOpen : true,
            withdrawalDanaOpen: data.withdrawalDanaOpen !== undefined ? data.withdrawalDanaOpen : true,
            withdrawalGopayOpen: data.withdrawalGopayOpen !== undefined ? data.withdrawalGopayOpen : true,
            gmailDefaultPassword: 'zero1122 / prabujaya',
            generatorOpen: data.generatorOpen !== undefined ? data.generatorOpen : true,
            adminWhatsApp: data.adminWhatsApp || '6285199219856',
            dailyGenerateLimit:
              typeof data.dailyGenerateLimit === 'number' && data.dailyGenerateLimit > 0
                ? data.dailyGenerateLimit
                : 10,
            storanClosedReason:
              data.storanClosedReason !== undefined
                ? data.storanClosedReason
                : DEFAULT_SETTINGS.storanClosedReason,
            rules: Array.isArray(data.rules) && data.rules.length > 0 ? data.rules : DEFAULT_RULES,
            apkDownloadUrl: data.apkDownloadUrl || DEFAULT_SETTINGS.apkDownloadUrl,
          };
          setSettings(updated);
          try {
            localStorage.setItem('azgmail_cached_settings', JSON.stringify(updated));
          } catch {}
        } else {
          setDoc(settingsDocRef, DEFAULT_SETTINGS).catch((err) => {
            console.warn('Could not auto-seed settings document:', err);
          });
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Settings snapshot warning (using local defaults):', error);
        setLoading(false);
      }
    );

    // Sinkronisasi realtime lokal dan antar-tab / window
    const unsubscribeSync = subscribeDataChange(() => {
      try {
        const cached = localStorage.getItem('azgmail_cached_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {}
    });

    return () => {
      unsubscribe();
      unsubscribeSync();
    };
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const merged = { ...settings, ...newSettings };
    // Update local state dan localStorage segera tanpa menunggu jaringan
    setSettings(merged);
    try {
      localStorage.setItem('azgmail_cached_settings', JSON.stringify(merged));
    } catch {}

    // Siarkan ke seluruh tab & komponen yang sedang terbuka
    notifyDataChange('all');

    try {
      await setDoc(doc(db, 'settings', 'general'), merged, { merge: true });
    } catch (error) {
      console.error('Error updating settings document in Firestore:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
