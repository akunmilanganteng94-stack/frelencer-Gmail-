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
  limit,
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

export function generateFreshStockAccounts(
  count: number,
  defaultPassword = 'zero1122',
  existingEmailsSet?: Set<string>
): { email: string; password: string }[] {
  const generated: { email: string; password: string }[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    let email = '';
    let attempts = 0;
    while (attempts < 200) {
      const first = INDONESIAN_FIRST_NAMES[Math.floor(Math.random() * INDONESIAN_FIRST_NAMES.length)];
      const last = INDONESIAN_LAST_NAMES[Math.floor(Math.random() * INDONESIAN_LAST_NAMES.length)];
      const num = Math.floor(100 + Math.random() * 99000);
      const sep = Math.random() > 0.4 ? '.' : '';
      email = `${first}${sep}${last}${num}@gmail.com`.toLowerCase();
      if (!used.has(email) && (!existingEmailsSet || !existingEmailsSet.has(email))) {
        used.add(email);
        if (existingEmailsSet) existingEmailsSet.add(email);
        break;
      }
      attempts++;
    }
    if (!email || used.has(email)) {
      const rnd = Math.random().toString(36).substring(2, 7);
      email = `user.${rnd}${Math.floor(100 + Math.random() * 900)}@gmail.com`.toLowerCase();
      used.add(email);
      if (existingEmailsSet) existingEmailsSet.add(email);
    }
    generated.push({
      email,
      password: defaultPassword,
    });
  }
  return generated;
}

export function useGmailStock(subscribe = false) {
  const [stock, setStock] = useState<GmailStockItem[]>([]);
  const [loading, setLoading] = useState(subscribe);

  useEffect(() => {
    if (!subscribe) {
      setLoading(false);
      return;
    }

    try {
      const stockColRef = collection(db, 'gmail_stock');
      const unsubscribe = onSnapshot(
        stockColRef,
        (snapshot) => {
          const items: GmailStockItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isUsed = data.status === 'used' || Boolean(data.claimedBy);
            items.push({
              id: docSnap.id,
              email: data.email || '',
              password: data.password || 'zero1122',
              status: isUsed ? 'used' : 'available',
              addedAt: data.addedAt || new Date().toISOString(),
              claimedBy: data.claimedBy || undefined,
              claimedByName: data.claimedByName || undefined,
              claimedByEmail: data.claimedByEmail || undefined,
              claimedAt: data.claimedAt || undefined,
            });
          });
          items.sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
          setStock(items);
          setLoading(false);
        },
        (err) => {
          console.warn('Could not read gmail_stock in realtime (notice):', err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Notice setting up gmail_stock listener:', e);
      setLoading(false);
    }
  }, [subscribe]);

  const seedInitialAccounts = async (count = 50, defaultPassword = 'zero1122') => {
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

  const replenishStock = async (count = 50, defaultPassword = 'zero1122'): Promise<number> => {
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

  const availableStock = stock.filter((item) => item.status !== 'used' && !item.claimedBy);
  const usedStock = stock.filter((item) => item.status === 'used' || Boolean(item.claimedBy));

  const addSingleAccount = async (email: string, password = 'zero1122') => {
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
      password: password.trim() || 'zero1122',
      status: 'available',
      addedAt: new Date().toISOString(),
    });
  };

  const addBulkAccounts = async (rawText: string, defaultPassword = 'zero1122'): Promise<number> => {
    localStorage.removeItem('gmail_stock_cleared_by_admin');
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return 0;

    const existingEmails = new Set(stock.map((s) => s.email.toLowerCase()));
    let addedCount = 0;
    const batch = writeBatch(db);

    for (const line of lines) {
      let emailPart = line.trim();
      let customPass = defaultPassword;
      if (emailPart.includes('|')) {
        const parts = emailPart.split('|');
        emailPart = parts[0].trim();
        customPass = parts[1]?.trim() || defaultPassword;
      }
      if (!emailPart.includes('@')) {
        emailPart = `${emailPart}@gmail.com`;
      }
      emailPart = emailPart.toLowerCase();

      if (
        (emailPart.endsWith('@gmail.com') || emailPart.endsWith('@googlemail.com')) &&
        !existingEmails.has(emailPart)
      ) {
        existingEmails.add(emailPart);
        const newDocRef = doc(collection(db, 'gmail_stock'));
        batch.set(newDocRef, {
          email: emailPart,
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
      defaultPassword = 'zero1122'
    ): Promise<GmailStockItem[]> => {
      if (count <= 0) return [];
      const timestamp = new Date().toISOString();
      const claimedItems: GmailStockItem[] = [];

      // Ambil seluruh dokumen dari gmail_stock
      const stockColRef = collection(db, 'gmail_stock');
      const snap = await getDocs(stockColRef);

      // Cari akun yang belum terpakai
      const availableDocs = snap.docs.filter((docSnap) => {
        const d = docSnap.data();
        return d.status !== 'used' && !d.claimedBy;
      });

      if (availableDocs.length === 0) {
        throw new Error(
          'Stok akun generator dari Admin saat ini kosong. Silakan tunggu admin mengisi stok baru atau hubungi admin.'
        );
      }

      const docsToClaim = availableDocs.slice(0, count);

      for (const docSnap of docsToClaim) {
        const data = docSnap.data();
        const itemEmail = data.email || '';
        const itemPass = data.password || defaultPassword;
        const item: GmailStockItem = {
          id: docSnap.id,
          email: itemEmail,
          password: itemPass,
          status: 'used',
          claimedBy: userId || 'user',
          claimedByName: userName || 'Freelancer',
          claimedByEmail: userEmail || '',
          claimedAt: timestamp,
          addedAt: data.addedAt || timestamp,
        };

        // Update dokumen stock di Firestore menjadi 'used' (Terpakai)
        await updateDoc(docSnap.ref, {
          status: 'used',
          claimedBy: userId || 'user',
          claimedByName: userName || 'Freelancer',
          claimedByEmail: userEmail || '',
          claimedAt: timestamp,
        });

        // Simpan juga ke claimed_emails secara aman untuk verifikasi storan
        try {
          const emailKey = itemEmail.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
          if (emailKey) {
            await setDoc(doc(db, 'claimed_emails', emailKey), {
              email: itemEmail.toLowerCase().trim(),
              claimedBy: userId || 'user',
              claimedByName: userName || 'Freelancer',
              claimedAt: timestamp,
            });
          }
        } catch (e) {
          console.warn('Non-fatal: could not save to claimed_emails:', e);
        }

        claimedItems.push(item);
      }

      // Update state lokal secara instan
      setStock((prev) =>
        prev.map((s) => {
          const matched = claimedItems.find((c) => c.id === s.id);
          return matched ? { ...s, ...matched, status: 'used' } : s;
        })
      );

      return claimedItems;
    },
    []
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
