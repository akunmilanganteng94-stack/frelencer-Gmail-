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
import { generateReferralCode } from '../lib/utils';
import {
  saveReferralCodeMapping,
  recordReferralForNewUser,
  captureReferralFromUrl,
  getPendingReferralCode,
  findInviterByCode,
  normalizeReferralCode,
  syncAndRepairReferralsForInviter,
} from '../lib/referralHelper';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  loginUser: (email: string, pass: string) => Promise<void>;
  registerUser: (name: string, email: string, pass: string, referralCodeInput?: string) => Promise<void>;
  loginWithGoogle: (referralCodeInput?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  refreshReferralSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['apriliansyahazril10@gmail.com', 'nenioke659@gmail.com'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('azgmail_cached_user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  // Quick loading resolver: loading memuat nya agak cepetan
  useEffect(() => {
    const quickTimer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(quickTimer);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        try {
          localStorage.removeItem('azgmail_cached_user_profile');
        } catch {}
        setLoading(false);
        return;
      }

      // Fast-load from local cache if matches
      try {
        const cachedRaw = localStorage.getItem(`azgmail_cached_user_profile_${user.uid}`);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && parsed.uid === user.uid) {
            setUserProfile(parsed);
            setLoading(false);
          }
        }
      } catch {}

      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeDoc = onSnapshot(
        userDocRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (!data.referralCode) {
              const myCode = generateReferralCode(user.uid);
              setDoc(userDocRef, { referralCode: myCode }, { merge: true }).catch(console.warn);
              data.referralCode = myCode;
            }
            saveReferralCodeMapping(data.referralCode, user).catch(console.warn);
            if (!data.referredBy) {
              const pendingCode = getPendingReferralCode();
              if (pendingCode) {
                recordReferralForNewUser(
                  { uid: user.uid, email: user.email, displayName: data.displayName },
                  pendingCode
                ).catch(console.warn);
              }
            }
            if (data.referralCode) {
              syncAndRepairReferralsForInviter(
                user.uid,
                data.referralCode,
                data.displayName,
                user.email || ''
              ).catch(console.warn);
            }
            setUserProfile(data);
            try {
              localStorage.setItem('azgmail_cached_user_profile', JSON.stringify(data));
              localStorage.setItem(`azgmail_cached_user_profile_${user.uid}`, JSON.stringify(data));
            } catch {}
          } else {
            const isDefaultAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim());
            const myCode = generateReferralCode(user.uid);
            const pendingCode = getPendingReferralCode();
            let inviterData: { uid: string; email: string; displayName: string } | null = null;
            if (pendingCode) {
              try {
                inviterData = await findInviterByCode(pendingCode);
              } catch (e) {
                console.warn('Inviter lookup notice during initial doc sync:', e);
              }
            }
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
              referralCode: myCode,
              referralRewardMilestones: [],
              ...(inviterData && inviterData.uid !== user.uid
                ? {
                    referredBy: inviterData.uid,
                    referredByCode: pendingCode,
                    inviterName: inviterData.displayName,
                  }
                : pendingCode
                ? { referredByCode: pendingCode }
                : {}),
            };
            setDoc(userDocRef, newProfile, { merge: true }).catch((e) => {
              console.warn('Initial user profile sync notice:', e);
            });
            saveReferralCodeMapping(myCode, user).catch(console.warn);
            if (pendingCode) {
              recordReferralForNewUser(user, pendingCode).catch(console.warn);
            }
            setUserProfile(newProfile);
            try {
              localStorage.setItem('azgmail_cached_user_profile', JSON.stringify(newProfile));
              localStorage.setItem(`azgmail_cached_user_profile_${user.uid}`, JSON.stringify(newProfile));
            } catch {}
          }
          setLoading(false);
        },
        (err) => {
          console.warn('User doc snapshot sync notice (using local profile while rules sync):', err?.message || err);
          const isDefaultAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim());
          const myCode = generateReferralCode(user.uid);
          setUserProfile((prev) => prev || {
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
            referralCode: myCode,
            referralRewardMilestones: [],
          });
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

  const registerUser = async (name: string, email: string, pass: string, referralCodeInput?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name.trim() }).catch(console.warn);

    const isDefaultAdmin = ADMIN_EMAILS.includes(email.toLowerCase().trim());
    const myReferralCode = generateReferralCode(user.uid);
    const effectiveRef = normalizeReferralCode(referralCodeInput || getPendingReferralCode());
    let inviterData: { uid: string; email: string; displayName: string } | null = null;
    if (effectiveRef) {
      try {
        inviterData = await findInviterByCode(effectiveRef);
      } catch (e) {
        console.warn('Inviter lookup notice during register:', e);
      }
    }

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
      referralCode: myReferralCode,
      referralRewardMilestones: [],
      ...(inviterData && inviterData.uid !== user.uid
        ? {
            referredBy: inviterData.uid,
            referredByCode: effectiveRef,
            inviterName: inviterData.displayName,
          }
        : effectiveRef
        ? { referredByCode: effectiveRef }
        : {}),
    };

    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    setUserProfile(profile);
    try {
      localStorage.setItem('azgmail_cached_user_profile', JSON.stringify(profile));
      localStorage.setItem(`azgmail_cached_user_profile_${user.uid}`, JSON.stringify(profile));
    } catch {}

    saveReferralCodeMapping(myReferralCode, {
      uid: user.uid,
      email: email.trim(),
      displayName: name.trim(),
    }).catch(console.warn);

    if (effectiveRef) {
      recordReferralForNewUser(
        {
          uid: user.uid,
          email: email.trim(),
          displayName: name.trim(),
        },
        effectiveRef
      ).catch(console.warn);
    }
  };

  const loginWithGoogle = async (referralCodeInput?: string) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userDocRef = doc(db, 'users', user.uid);
    const isDefaultAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim());
    const myCode = generateReferralCode(user.uid);

    try {
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        const effectiveRef = normalizeReferralCode(referralCodeInput || getPendingReferralCode());
        let inviterData: { uid: string; email: string; displayName: string } | null = null;
        if (effectiveRef) {
          try {
            inviterData = await findInviterByCode(effectiveRef);
          } catch (e) {
            console.warn('Inviter lookup notice during Google sign-in:', e);
          }
        }

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
          referralCode: myCode,
          referralRewardMilestones: [],
          ...(inviterData && inviterData.uid !== user.uid
            ? {
                referredBy: inviterData.uid,
                referredByCode: effectiveRef,
                inviterName: inviterData.displayName,
              }
            : effectiveRef
            ? { referredByCode: effectiveRef }
            : {}),
        };

        await setDoc(userDocRef, profile, { merge: true });
        setUserProfile(profile);
        try {
          localStorage.setItem('azgmail_cached_user_profile', JSON.stringify(profile));
          localStorage.setItem(`azgmail_cached_user_profile_${user.uid}`, JSON.stringify(profile));
        } catch {}
        saveReferralCodeMapping(myCode, {
          uid: user.uid,
          email: user.email || '',
          displayName: profile.displayName,
        }).catch(console.warn);

        if (effectiveRef) {
          recordReferralForNewUser(
            {
              uid: user.uid,
              email: user.email || '',
              displayName: profile.displayName,
            },
            effectiveRef
          ).catch(console.warn);
        }
      } else {
        const existing = docSnap.data() as UserProfile;
        if (!existing.referralCode) {
          await setDoc(userDocRef, { referralCode: myCode }, { merge: true }).catch(console.warn);
          existing.referralCode = myCode;
        }
        saveReferralCodeMapping(existing.referralCode || myCode, {
          uid: user.uid,
          email: user.email || '',
          displayName: existing.displayName,
        }).catch(console.warn);
        setUserProfile(existing);
        try {
          localStorage.setItem('azgmail_cached_user_profile', JSON.stringify(existing));
          localStorage.setItem(`azgmail_cached_user_profile_${user.uid}`, JSON.stringify(existing));
        } catch {}
      }
    } catch (fsErr) {
      console.warn('Profile doc fetch/write issue during Google sign-in:', fsErr);
      const fallbackProfile: UserProfile = {
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
        referralCode: myCode,
        referralRewardMilestones: [],
      };
      setUserProfile(fallbackProfile);
    }
  };

  const logoutUser = async () => {
    try {
      localStorage.removeItem('azgmail_cached_user_profile');
    } catch {}
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

  const refreshReferralSync = async () => {
    if (!currentUser || !userProfile?.referralCode) return;
    await syncAndRepairReferralsForInviter(
      currentUser.uid,
      userProfile.referralCode,
      userProfile.displayName,
      currentUser.email || ''
    );
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
        refreshReferralSync,
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
