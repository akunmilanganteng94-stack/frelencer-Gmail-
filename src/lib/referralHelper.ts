import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateReferralCode } from './utils';

const PENDING_REF_STORAGE_KEY = 'azgmail_pending_ref';

export function captureReferralFromUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const searchParams = new URLSearchParams(window.location.search);
    let code =
      searchParams.get('ref') ||
      searchParams.get('referral') ||
      searchParams.get('r') ||
      searchParams.get('code');

    if (!code && window.location.hash) {
      const hashStr = window.location.hash;
      if (hashStr.includes('?')) {
        const hashQuery = hashStr.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        code =
          hashParams.get('ref') ||
          hashParams.get('referral') ||
          hashParams.get('r') ||
          hashParams.get('code');
      } else if (hashStr.includes('ref=')) {
        const match = hashStr.match(/ref=([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) code = match[1];
      }
    }

    if (code) {
      const clean = normalizeReferralCode(code);
      if (clean) {
        localStorage.setItem(PENDING_REF_STORAGE_KEY, clean);
        sessionStorage.setItem(PENDING_REF_STORAGE_KEY, clean);
        return clean;
      }
    }
  } catch (e) {
    console.warn('Error capturing referral code from URL:', e);
  }
  return getPendingReferralCode();
}

export function getPendingReferralCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (
      localStorage.getItem(PENDING_REF_STORAGE_KEY) ||
      sessionStorage.getItem(PENDING_REF_STORAGE_KEY) ||
      ''
    ).trim().toUpperCase();
  } catch {
    return '';
  }
}

export function clearPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_REF_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_REF_STORAGE_KEY);
  } catch {}
}

export function setPendingReferralCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = normalizeReferralCode(code);
    if (clean) {
      localStorage.setItem(PENDING_REF_STORAGE_KEY, clean);
      sessionStorage.setItem(PENDING_REF_STORAGE_KEY, clean);
    }
  } catch {}
}

export function normalizeReferralCode(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  if (str.includes('?') || str.includes('ref=') || str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const match = str.match(/[?&#]ref=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        str = match[1];
      } else {
        const urlObj = new URL(str.startsWith('http') ? str : `https://dummy.local/${str}`);
        const refVal = urlObj.searchParams.get('ref') || urlObj.searchParams.get('referral') || urlObj.searchParams.get('code');
        if (refVal) str = refVal;
      }
    } catch {
      const match = str.match(/ref=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) str = match[1];
    }
  }
  const clean = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean;
}

export async function saveReferralCodeMapping(
  code: string,
  user: { uid: string; email?: string | null; displayName?: string | null }
): Promise<void> {
  if (!code || !user.uid) return;
  try {
    const cleanCode = normalizeReferralCode(code);
    if (!cleanCode) return;
    const payload = {
      code: cleanCode,
      inviterUid: user.uid,
      inviterEmail: user.email || '',
      inviterName: user.displayName || user.email?.split('@')[0] || 'Member AZGmail',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'referral_codes', cleanCode), payload, { merge: true });
    if (cleanCode.startsWith('AZG') && cleanCode.length > 3) {
      const stripped = cleanCode.slice(3);
      await setDoc(doc(db, 'referral_codes', stripped), payload, { merge: true });
    }
    await setDoc(doc(db, 'referral_codes', user.uid), payload, { merge: true });
  } catch (err) {
    console.warn('Could not save referral code mapping:', err);
  }
}

export async function findInviterByCode(
  referralCode: string
): Promise<{ uid: string; email: string; displayName: string; referralCode: string } | null> {
  if (!referralCode) return null;
  const cleanCode = normalizeReferralCode(referralCode);
  if (!cleanCode) return null;

  const variants = new Set<string>();
  variants.add(cleanCode);
  if (cleanCode.startsWith('AZG')) {
    const stripped = cleanCode.slice(3);
    if (stripped) variants.add(stripped);
  } else {
    variants.add(`AZG${cleanCode}`);
  }

  for (const v of variants) {
    try {
      const codeDocSnap = await getDoc(doc(db, 'referral_codes', v));
      if (codeDocSnap.exists()) {
        const data = codeDocSnap.data();
        if (data?.inviterUid) {
          return {
            uid: data.inviterUid,
            email: data.inviterEmail || '',
            displayName: data.inviterName || 'Teman Pengundang',
            referralCode: data.code || v,
          };
        }
      }
    } catch {}
  }

  try {
    const directUserSnap = await getDoc(doc(db, 'users', cleanCode));
    if (directUserSnap.exists()) {
      const uData = directUserSnap.data();
      const myCode = uData.referralCode || generateReferralCode(directUserSnap.id);
      return {
        uid: directUserSnap.id,
        email: uData?.email || '',
        displayName: uData?.displayName || uData?.email?.split('@')[0] || 'Teman Pengundang',
        referralCode: myCode,
      };
    }
  } catch {}

  return null;
}

export async function recordReferralForNewUser(
  newUser: { uid: string; email?: string | null; displayName?: string | null },
  explicitCode?: string
): Promise<boolean> {
  if (!newUser?.uid) return false;
  const rawCode = explicitCode || getPendingReferralCode();
  const targetCode = normalizeReferralCode(rawCode);
  if (!targetCode) return false;

  try {
    const referralsRef = collection(db, 'referrals');
    const inviter = await findInviterByCode(targetCode);

    if (inviter && inviter.uid !== newUser.uid) {
      const referralDocRef = doc(referralsRef, `${inviter.uid}_${newUser.uid}`);
      await setDoc(
        referralDocRef,
        {
          inviterUid: inviter.uid,
          inviterEmail: inviter.email,
          inviterName: inviter.displayName,
          invitedUid: newUser.uid,
          invitedEmail: newUser.email || '',
          invitedName: newUser.displayName || newUser.email?.split('@')[0] || 'Freelancer Baru',
          referralCodeUsed: targetCode,
          status: 'pending_submission',
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const userDocRef = doc(db, 'users', newUser.uid);
      await setDoc(
        userDocRef,
        {
          referredBy: inviter.uid,
          referredByCode: targetCode,
          inviterName: inviter.displayName,
        },
        { merge: true }
      );
      clearPendingReferralCode();
      return true;
    } else {
      try {
        const userDocRef = doc(db, 'users', newUser.uid);
        await setDoc(
          userDocRef,
          {
            referredByCode: targetCode,
          },
          { merge: true }
        );
      } catch {}
      clearPendingReferralCode();
      return false;
    }
  } catch (err) {
    console.warn('Failed to record referral for new user:', err);
    return false;
  }
}

export async function syncAndRepairReferralsForInviter(
  inviterUid: string,
  inviterCode: string,
  inviterName?: string,
  inviterEmail?: string
): Promise<number> {
  if (!inviterUid) return 0;
  const cleanCode = normalizeReferralCode(inviterCode);
  const strippedCode = cleanCode.startsWith('AZG') ? cleanCode.slice(3) : cleanCode;
  let repairedCount = 0;

  try {
    const referralsRef = collection(db, 'referrals');
    const qRef = query(referralsRef, where('inviterUid', '==', inviterUid));
    const refSnap = await getDocs(qRef);

    for (const rDoc of refSnap.docs) {
      const rData = rDoc.data();
      if (rData.status !== 'completed' && rData.invitedUid) {
        try {
          const subQ = query(
            collection(db, 'submissions'),
            where('userId', '==', rData.invitedUid),
            where('status', '==', 'Diterima')
          );
          const subSnap = await getDocs(subQ);
          if (!subSnap.empty) {
            await setDoc(rDoc.ref, { status: 'completed' }, { merge: true });
            repairedCount++;
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Notice syncing/repairing referrals for inviter:', err);
  }
  return repairedCount;
}

export async function processReferralOnSubmissionAccepted(
  submissionUserId: string,
  submissionId: string
): Promise<void> {
  if (!submissionUserId) return;
  try {
    const referralsRef = collection(db, 'referrals');
    const q = query(
      referralsRef,
      where('invitedUid', '==', submissionUserId)
    );
    const refSnap = await getDocs(q);

    let inviterUid = '';
    if (!refSnap.empty) {
      for (const refDoc of refSnap.docs) {
        const referralData = refDoc.data();
        inviterUid = referralData.inviterUid;
        if (referralData.status !== 'completed') {
          await updateDoc(doc(db, 'referrals', refDoc.id), {
            status: 'completed',
            completedAt: new Date().toISOString(),
            firstSubmissionId: submissionId,
          });
        }
      }
    } else {
      const userSnap = await getDoc(doc(db, 'users', submissionUserId));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        if (uData.referredBy) {
          inviterUid = uData.referredBy;
          const refDocRef = doc(referralsRef, `${inviterUid}_${submissionUserId}`);
          await setDoc(
            refDocRef,
            {
              inviterUid,
              inviterEmail: '',
              inviterName: uData.inviterName || 'Teman',
              invitedUid: submissionUserId,
              invitedEmail: uData.email || '',
              invitedName: uData.displayName || 'Freelancer',
              referralCodeUsed: uData.referredByCode || '',
              status: 'completed',
              createdAt: uData.createdAt || new Date().toISOString(),
              completedAt: new Date().toISOString(),
              firstSubmissionId: submissionId,
            },
            { merge: true }
          );
        }
      }
    }

    if (!inviterUid) return;

    const qCompleted = query(
      referralsRef,
      where('inviterUid', '==', inviterUid),
      where('status', '==', 'completed')
    );
    const completedSnap = await getDocs(qCompleted);
    const totalCompleted = completedSnap.size;

    const inviterUserRef = doc(db, 'users', inviterUid);
    await runTransaction(db, async (transaction) => {
      const inviterDoc = await transaction.get(inviterUserRef);
      if (!inviterDoc.exists()) return;
      const inviterData = inviterDoc.data();
      const currentMilestones: number[] = Array.isArray(inviterData.referralRewardMilestones)
        ? inviterData.referralRewardMilestones
        : [];
      const earnedMilestonesCount = Math.floor(totalCompleted / 20);

      let bonusToAdd = 0;
      const updatedMilestones = [...currentMilestones];
      for (let m = 1; m <= earnedMilestonesCount; m++) {
        const milestoneThreshold = m * 20;
        if (!updatedMilestones.includes(milestoneThreshold)) {
          updatedMilestones.push(milestoneThreshold);
          bonusToAdd += 10000;
        }
      }

      const updateData: Record<string, any> = {
        totalInvited: totalCompleted,
      };

      if (bonusToAdd > 0) {
        updateData.balance = (inviterData.balance || 0) + bonusToAdd;
        updateData.totalEarned = (inviterData.totalEarned || 0) + bonusToAdd;
        updateData.referralRewardMilestones = updatedMilestones;
      }

      transaction.update(inviterUserRef, updateData);
    });
  } catch (err) {
    console.warn('Error processing referral bonus on submission accepted:', err);
  }
}
