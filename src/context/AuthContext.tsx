import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, OperationType } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  loginUser: (email: string, pass: string) => Promise<void>;
  registerUser: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin email configured in system
const ADMIN_EMAILS = ['apriliansyahazril10@gmail.com'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Listen to real-time changes on user's profile document
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeDoc = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserProfile(data);
          } else {
            // Document doesn't exist yet (e.g. newly signed up or social login)
            const isDefaultAdmin = ADMIN_EMAILS.includes(user.email || '');
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              role: isDefaultAdmin ? 'admin' : 'user',
              balance: 0,
              totalEarned: 0,
              totalWithdrawn: 0,
              pendingWithdrawn: 0,
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            setDoc(userDocRef, newProfile).catch((e) => {
              console.warn('Error creating initial user doc:', e);
            });
            setUserProfile(newProfile);
          }
          setLoading(false);
        },
        (err) => {
          console.error('User doc snapshot error:', err);
          setLoading(false);
        }
      );

      return () => unsubscribeDoc();
    });

    return () => unsubscribeAuth();
  }, []);

  const isAdmin = Boolean(
    (currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) ||
    userProfile?.role === 'admin'
  );

  const loginUser = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const registerUser = async (name: string, email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name.trim() });

    const isDefaultAdmin = ADMIN_EMAILS.includes(email.toLowerCase().trim());
    const profile: UserProfile = {
      uid: user.uid,
      email: email.trim(),
      displayName: name.trim(),
      role: isDefaultAdmin ? 'admin' : 'user',
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingWithdrawn: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), profile);
    setUserProfile(profile);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    const isDefaultAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim());
    if (!docSnap.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User Google',
        role: isDefaultAdmin ? 'admin' : 'user',
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawn: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, profile);
      setUserProfile(profile);
    } else {
      const existing = docSnap.data() as UserProfile;
      setUserProfile(existing);
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateProfileName = async (newName: string) => {
    if (!currentUser) throw new Error('Pengguna tidak login.');
    await updateProfile(currentUser, { displayName: newName.trim() });
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: newName.trim(),
      });
      setUserProfile((prev) => (prev ? { ...prev, displayName: newName.trim() } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const changePassword = async (newPass: string) => {
    if (!currentUser) throw new Error('Pengguna tidak login.');
    await updatePassword(currentUser, newPass);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        loading,
        loginUser,
        registerUser,
        loginWithGoogle,
        logoutUser,
        resetPassword,
        updateProfileName,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
