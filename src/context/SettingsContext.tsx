import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SystemSettings, OperationType } from '../types';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const DEFAULT_GMAIL_PASSWORD = 'sgsg1122';
const DEFAULT_RULES = [
  'Password akun Gmail WAJIB menggunakan: sgsg1122 (atau sesuai konfigurasi aktif dari Admin).',
  'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor yang terkunci.',
  'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) atau kunci keamanan yang menghambat verifikasi admin.',
  'Kirimkan storan dalam sistem 1 baris untuk 1 akun Gmail (Format: email@gmail.com atau email@gmail.com|password).',
  'Gunakan fitur "Generator Akun Gmail" untuk kombinasi nama dan alamat email yang rapi serta otomatis.',
  'Dilarang mengirim email fiktif, akun hasil retas/curian, atau akun yang belum terdaftar di Google.',
  'Admin berhak menolak akun yang gagal login, terkena disabled, atau tidak menggunakan password wajib.',
];

const DEFAULT_SETTINGS: SystemSettings = {
  storanOpen: true,
  storanSchedule: 'Senin - Jumat, 07.00 - 17.00 WIB (Sabtu & Minggu CLOSE)',
  pricePerSubmission: 3000,
  withdrawalOpen: true,
  minWithdrawal: 4000,
  rules: DEFAULT_RULES,
  announcement:
    'Storan Akun Gmail OPEN setiap Senin - Jumat!\nJam operasional: 07.00 - 17.00 WIB\nPassword wajib Gmail: sgsg1122\nPastikan akun fresh dan tidak mengaktifkan 2FA.',
  gmailDefaultPassword: DEFAULT_GMAIL_PASSWORD,
  generatorOpen: true,
  adminWhatsApp: '6285199219856',
  dailyGenerateLimit: 10,
  storanClosedReason:
    'Admin sedang menutup penerimaan akun baru. Storan aktif setiap Senin - Jumat. Silakan kembali pada jam operasional.',
};

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<SystemSettings>;
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            gmailDefaultPassword: data.gmailDefaultPassword || DEFAULT_GMAIL_PASSWORD,
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
          });
        } else {
          // Document does not exist yet, seed with defaults
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
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
