import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { GmailStockItem, OperationType } from '../types';

const INDONESIAN_FIRST_NAMES = [
  'dimas', 'bayu', 'aditya', 'rizky', 'fajar', 'budi', 'danang', 'gilang', 'ilham', 'joko',
  'kevin', 'lukman', 'naufal', 'satria', 'taufik', 'wahyu', 'yoga', 'anisa', 'dinda', 'dewi',
  'fitri', 'gita', 'indah', 'maya', 'nadia', 'rani', 'siti', 'tiara', 'zahra', 'riska',
  'arif', 'agus', 'bagus', 'cahyo', 'doni', 'eko', 'ferry', 'hendra', 'indra', 'irwan',
  'kurnia', 'mario', 'nurul', 'okta', 'putra', 'rendy', 'sandi', 'tri', 'vian', 'yudi'
];

const INDONESIAN_LAST_NAMES = [
  'pratama', 'wijaya', 'santoso', 'kurniawan', 'hidayat', 'setiawan', 'prasetyo', 'firmansyah',
  'gunawan', 'suryanto', 'utomo', 'subagyo', 'permana', 'laksana', 'mahendra', 'saputra',
  'kusuma', 'lestari', 'putri', 'anggraeni', 'handayani', 'permata', 'susanti', 'safitri',
  'wulandari', 'puspitasari', 'nurhaliza', 'novita', 'aulia', 'oktaviani', 'ramadhan',
  'suhendra', 'saputro', 'ananda', 'wardhana', 'purnomo', 'wicaksono', 'pangestu'
];

export function generateFreshStockAccounts(count: number, defaultPassword = 'sgsg1122'): { email: string; password: string }[] {
  const generated: { email: string; password: string }[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    let email = '';
    let attempts = 0;
    while (attempts < 100) {
      const first = INDONESIAN_FIRST_NAMES[Math.floor(Math.random() * INDONESIAN_FIRST_NAMES.length)];
      const last = INDONESIAN_LAST_NAMES[Math.floor(Math.random() * INDONESIAN_LAST_NAMES.length)];
      const num = Math.floor(100 + Math.random() * 900);
      const sep = Math.random() > 0.5 ? '.' : '';
      email = `${first}${sep}${last}${num}@gmail.com`.toLowerCase();
      if (!used.has(email)) {
        used.add(email);
        break;
      }
      attempts++;
    }
    if (email) {
      generated.push({
        email,
        password: defaultPassword,
      });
    }
  }
  return generated;
}

export function useGmailStock() {
  const [stock, setStock] = useState<GmailStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stockColRef = collection(db, 'gmail_stock');
    const q = query(stockColRef, orderBy('addedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: GmailStockItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            email: data.email || '',
            password: data.password || 'sgsg1122',
            status: data.status || 'available',
            addedAt: data.addedAt || new Date().toISOString(),
            claimedBy: data.claimedBy || undefined,
            claimedByName: data.claimedByName || undefined,
            claimedByEmail: data.claimedByEmail || undefined,
            claimedAt: data.claimedAt || undefined,
          });
        });
        setStock(items);
        setLoading(false);

        if (
          items.length === 0 &&
          !snapshot.metadata.hasPendingWrites &&
          localStorage.getItem('gmail_stock_cleared_by_admin') !== 'true' &&
          !sessionStorage.getItem('gmail_stock_seed_attempted')
        ) {
          sessionStorage.setItem('gmail_stock_seed_attempted', 'true');
          seedInitialAccounts();
        }
      },
      (err) => {
        console.warn('Could not read gmail_stock in realtime:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const seedInitialAccounts = async (count = 50, defaultPassword = 'sgsg1122') => {
    try {
      const freshAccounts = generateFreshStockAccounts(count, defaultPassword);
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      freshAccounts.forEach(({ email, password }) => {
        const newDocRef = doc(collection(db, 'gmail_stock'));
        batch.set(newDocRef, {
          email,
          password,
          status: 'available',
          addedAt: timestamp,
        });
      });

      await batch.commit();
      return freshAccounts.length;
    } catch (e) {
      console.warn('Failed to seed initial stock:', e);
      return 0;
    }
  };

  const replenishStock = async (count = 50, defaultPassword = 'sgsg1122'): Promise<number> => {
    localStorage.removeItem('gmail_stock_cleared_by_admin');
    const freshAccounts = generateFreshStockAccounts(count, defaultPassword);
    const existingEmails = new Set(stock.map((s) => s.email.toLowerCase()));
    const toAdd = freshAccounts.filter((a) => !existingEmails.has(a.email.toLowerCase()));

    if (toAdd.length === 0) return 0;

    const timestamp = new Date().toISOString();
    for (let i = 0; i < toAdd.length; i += 400) {
      const chunk = toAdd.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(({ email, password }) => {
        const newDocRef = doc(collection(db, 'gmail_stock'));
        batch.set(newDocRef, {
          email,
          password,
          status: 'available',
          addedAt: timestamp,
        });
      });
      await batch.commit();
    }
    return toAdd.length;
  };

  const resetAllUsedToAvailable = async (): Promise<number> => {
    const usedItems = stock.filter((s) => s.status === 'used');
    if (usedItems.length === 0) return 0;

    for (let i = 0; i < usedItems.length; i += 400) {
      const chunk = usedItems.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, 'gmail_stock', item.id);
        batch.update(docRef, {
          status: 'available',
          claimedBy: null,
          claimedByName: null,
          claimedByEmail: null,
          claimedAt: null,
        });
      });
      await batch.commit();
    }
    return usedItems.length;
  };

  const availableStock = stock.filter((item) => item.status === 'available');
  const usedStock = stock.filter((item) => item.status === 'used');

  const addSingleAccount = async (email: string, password = 'sgsg1122') => {
    localStorage.removeItem('gmail_stock_cleared_by_admin');
    const cleanEmail = email.trim();
    if (!cleanEmail) throw new Error('Email tidak boleh kosong.');
    if (!cleanEmail.includes('@gmail.com') && !cleanEmail.includes('@googlemail.com')) {
      throw new Error('Alamat harus berupa akun Gmail (@gmail.com).');
    }

    const exists = stock.some((s) => s.email.toLowerCase() === cleanEmail.toLowerCase());
    if (exists) {
      throw new Error(`Email ${cleanEmail} sudah ada di dalam stok.`);
    }

    const newDocRef = doc(collection(db, 'gmail_stock'));
    await setDoc(newDocRef, {
      email: cleanEmail,
      password: password.trim() || 'sgsg1122',
      status: 'available',
      addedAt: new Date().toISOString(),
    });
  };

  const addBulkAccounts = async (rawText: string, defaultPassword = 'sgsg1122'): Promise<number> => {
    localStorage.removeItem('gmail_stock_cleared_by_admin');
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return 0;

    const existingEmails = new Set(stock.map((s) => s.email.toLowerCase()));
    let addedCount = 0;
    const batch = writeBatch(db);

    for (const line of lines) {
      const parts = line.split('|');
      const email = parts[0].trim();
      const customPass = parts[1] ? parts[1].trim() : defaultPassword;

      if (
        (email.includes('@gmail.com') || email.includes('@googlemail.com')) &&
        !existingEmails.has(email.toLowerCase())
      ) {
        existingEmails.add(email.toLowerCase());
        const newDocRef = doc(collection(db, 'gmail_stock'));
        batch.set(newDocRef, {
          email,
          password: customPass,
          status: 'available',
          addedAt: new Date().toISOString(),
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await batch.commit();
    }
    return addedCount;
  };

  const updateAccount = async (id: string, updates: Partial<GmailStockItem>) => {
    const docRef = doc(db, 'gmail_stock', id);
    await updateDoc(docRef, updates);
  };

  const deleteAccount = async (id: string) => {
    setStock((prev) => prev.filter((item) => item.id !== id));
    try {
      const docRef = doc(db, 'gmail_stock', id);
      await deleteDoc(docRef);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `gmail_stock/${id}`);
      throw err;
    }
  };

  const clearUsedAccounts = async () => {
    setStock((prev) => prev.filter((item) => item.status !== 'used'));
    try {
      const colRef = collection(db, 'gmail_stock');
      const q = query(colRef, where('status', '==', 'used'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, 'gmail_stock');
      throw err;
    }
  };

  const claimAccounts = useCallback(
    async (
      count: number,
      userId?: string,
      userName?: string,
      userEmail?: string,
      defaultPassword = 'sgsg1122'
    ): Promise<GmailStockItem[]> => {
      let currentAvailable = stock.filter((s) => s.status === 'available');

      if (currentAvailable.length < count) {
        const needed = count - currentAvailable.length + 20;
        const fresh = generateFreshStockAccounts(needed, defaultPassword);
        const timestamp = new Date().toISOString();
        const batch = writeBatch(db);
        const newCreatedItems: GmailStockItem[] = [];

        fresh.forEach(({ email, password }) => {
          const newDocRef = doc(collection(db, 'gmail_stock'));
          const itemData: GmailStockItem = {
            id: newDocRef.id,
            email,
            password,
            status: 'available',
            addedAt: timestamp,
          };
          batch.set(newDocRef, itemData);
          newCreatedItems.push(itemData);
        });

        await batch.commit();
        currentAvailable = [...currentAvailable, ...newCreatedItems];
      }

      const takeCount = Math.min(count, currentAvailable.length);
      const chosen = currentAvailable.slice(0, takeCount);

      try {
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();
        chosen.forEach((item) => {
          const docRef = doc(db, 'gmail_stock', item.id);
          batch.update(docRef, {
            status: 'used',
            claimedBy: userId || 'user',
            claimedByName: userName || 'Freelancer',
            claimedByEmail: userEmail || '',
            claimedAt: timestamp,
          });
        });
        await batch.commit();
      } catch (err) {
        console.warn('Failed to mark claimed accounts in batch:', err);
      }

      return chosen;
    },
    [stock]
  );

  const clearAllStock = async () => {
    localStorage.setItem('gmail_stock_cleared_by_admin', 'true');
    setStock([]);
    try {
      const colRef = collection(db, 'gmail_stock');
      const snap = await getDocs(colRef);
      if (snap.empty) return;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, 'gmail_stock');
      throw err;
    }
  };

  return {
    stock,
    availableStock,
    usedStock,
    loading,
    addSingleAccount,
    addBulkAccounts,
    updateAccount,
    deleteAccount,
    clearUsedAccounts,
    clearAllStock,
    claimAccounts,
    seedInitialAccounts,
    replenishStock,
    resetAllUsedToAvailable,
  };
}
