import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SystemSettings } from '../types';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const DEFAULT_GMAIL_PASSWORD = 'zero1122';
const DEFAULT_PASSWORD_1 = 'zero1122';
const DEFAULT_PASSWORD_2 = 'prabujaya';

const DEFAULT_RULES = [
  'Password akun Gmail dapat memilih password yang telah ditentukan admin.',
  'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor yang terkunci.',
  'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) atau kunci keamanan yang menghambat verifikasi admin.',
  'Kirimkan storan dalam sistem 1 baris untuk 1 akun Gmail (Format: email@gmail.com).',
  'Gunakan fitur "Generator Akun Gmail" untuk kombinasi nama dan alamat email yang rapi serta otomatis.',
  'Dilarang mengirim email fiktif, akun hasil retas/curian, atau akun yang belum terdaftar di Google.',
  'Admin berhak menolak akun yang gagal login, terkena disabled, atau tidak menggunakan password pilihan.',
];

const DEFAULT_SETTINGS: SystemSettings = {
  storanOpen: true,
  storanSchedule: 'Senin - Jumat, 07.00 - 17.00 WIB (Sabtu & Minggu CLOSE)',
  pricePerSubmission: 3000,
  withdrawalOpen: true,
  withdrawalDanaOpen: true,
  withdrawalGopayOpen: true,
  passwordZero1122Open: true,
  passwordPrabujayaOpen: true,
  password1Name: DEFAULT_PASSWORD_1,
  password2Name: DEFAULT_PASSWORD_2,
  minWithdrawal: 4000,
  rules: DEFAULT_RULES,
  announcement:
    'Storan Akun Gmail OPEN setiap Senin - Jumat!\nJam operasional: 07.00 - 17.00 WIB\nPilihan password wajib sesuai sistem\nPastikan akun fresh dan tidak mengaktifkan 2FA.',
  gmailDefaultPassword: DEFAULT_GMAIL_PASSWORD,
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
            withdrawalOpen: data.withdrawalOpen !== undefined ? data.withdrawalOpen : true,
            withdrawalDanaOpen: data.withdrawalDanaOpen !== undefined ? data.withdrawalDanaOpen : true,
            withdrawalGopayOpen: data.withdrawalGopayOpen !== undefined ? data.withdrawalGopayOpen : true,
            passwordZero1122Open: data.passwordZero1122Open !== undefined ? data.passwordZero1122Open : true,
            passwordPrabujayaOpen: data.passwordPrabujayaOpen !== undefined ? data.passwordPrabujayaOpen : true,
            password1Name: data.password1Name || DEFAULT_PASSWORD_1,
            password2Name: data.password2Name || DEFAULT_PASSWORD_2,
            gmailDefaultPassword: data.gmailDefaultPassword || data.password1Name || DEFAULT_GMAIL_PASSWORD,
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
    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const merged = { ...settings, ...newSettings };
      await setDoc(doc(db, 'settings', 'general'), merged, { merge: true });
      setSettings(merged);
      try {
        localStorage.setItem('azgmail_cached_settings', JSON.stringify(merged));
      } catch {}
    } catch (error) {
      console.error('Error updating settings document:', error);
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
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
