import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { OperationType } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyAjtpQhbgVOupLhOT0fcQBo4lt5e-RMSE8",
  authDomain: "frelencer-8ab18.firebaseapp.com",
  projectId: "frelencer-8ab18",
  storageBucket: "frelencer-8ab18.firebasestorage.app",
  messagingSenderId: "518905898974",
  appId: "1:518905898974:web:992219bd0b4990f35fdf4f",
  measurementId: "G-Q3VSWSCC92"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firestore Error handler per skill instructions
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

// Validate Firestore connection on boot
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'general'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears to be offline or network restricted.');
    }
    return false;
  }
}
