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

const INITIAL_STARTER_ACCOUNTS = [
  'dimas.pratama912@gmail.com',
  'bayu.wijaya843@gmail.com',
  'aditya.santoso521@gmail.com',
  'rizky.kurniawan714@gmail.com',
  'fajar.hidayat392@gmail.com',
  'budi.setiawan635@gmail.com',
  'danang.prasetyo441@gmail.com',
  'gilang.firmansyah819@gmail.com',
  'ilham.gunawan290@gmail.com',
  'joko.suryanto173@gmail.com',
  'kevin.utomo862@gmail.com',
  'lukman.subagyo355@gmail.com',
  'naufal.permana904@gmail.com',
  'satria.laksana628@gmail.com',
  'taufik.mahendra417@gmail.com',
  'wahyu.saputra573@gmail.com',
  'yoga.kusuma389@gmail.com',
  'anisa.lestari712@gmail.com',
  'dinda.putri469@gmail.com',
  'dewi.anggraeni835@gmail.com',
  'fitri.handayani291@gmail.com',
  'gita.permata540@gmail.com',
  'indah.susanti673@gmail.com',
  'maya.safitri918@gmail.com',
  'nadia.wulandari324@gmail.com',
  'rani.puspitasari582@gmail.com',
  'siti.nurhaliza741@gmail.com',
  'tiara.novita863@gmail.com',
  'zahra.aulia492@gmail.com',
  'riska.oktaviani615@gmail.com',
];

export function useGmailStock() {
  const [stock, setStock] = useState<GmailStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to realtime stock updates
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
            password: data.password || '',
            status: data.status || 'available',
            addedAt: data.addedAt || new Date().toISOString(),
            claimedBy: data.claimedBy || undefined,
            claimedAt: data.claimedAt || undefined,
          });
        });
        setStock(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Could not read gmail_stock in realtime:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const seedInitialAccounts = async () => {
    try {
      const batch = writeBatch(db);
      INITIAL_STARTER_ACCOUNTS.forEach((email) => {
        const newDocRef = doc(collection(db, 'gmail_stock'));
        batch.set(newDocRef, {
          email,
          password: '',
          status: 'available',
          addedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Failed to auto-seed initial stock:', e);
    }
  };

  const availableStock = stock.filter((item) => item.status === 'available');
  const usedStock = stock.filter((item) => item.status === 'used');

  const addSingleAccount = async (email: string, password?: string) => {
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
      password: password?.trim() || '',
      status: 'available',
      addedAt: new Date().toISOString(),
    });
  };

  const addBulkAccounts = async (rawText: string, defaultPassword?: string): Promise<number> => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return 0;
    const existingEmails = new Set(stock.map((s) => s.email.toLowerCase()));
    let addedCount = 0;
    const batch = writeBatch(db);
    for (const line of lines) {
      const parts = line.split('|');
      const email = parts[0].trim();
      const customPass = parts[1] ? parts[1].trim() : defaultPassword?.trim() || '';
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
    async (count: number, userId?: string): Promise<GmailStockItem[]> => {
      const currentAvailable = stock.filter((s) => s.status === 'available');
      if (currentAvailable.length === 0) {
        throw new Error('Stok akun Gmail admin sedang habis. Silakan hubungi admin untuk restock.');
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
  };
}
