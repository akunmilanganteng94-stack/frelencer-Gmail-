import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDoc } from 'firebase/firestore';
import { OperationType } from '../types';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAjtpQhbgVOupLhOT0fcQBo4lt5e-RMSE8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "frelencer-8ab18.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "frelencer-8ab18",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "frelencer-8ab18.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "518905898974",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:518905898974:web:992219bd0b4990f35fdf4f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Q3VSWSCC92"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling to eliminate WebSocket connection drops
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth.currentUser;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(error instanceof Error ? error.message : JSON.stringify(errInfo));
}

export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'settings', 'general'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears to be offline or network restricted.');
    }
    return false;
  }
}
