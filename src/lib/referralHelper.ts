import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Checks and updates referral status when a user's Gmail submission is accepted.
 * Condition: "Syarat: Teman melakukan stor Gmail pertama yang diterima"
 * When target 20 completed friends is reached (e.g. 20, 40, etc.),
 * automatically credit Rp 10.000 to the inviter's balance and totalEarned!
 */
export async function processReferralOnSubmissionAccepted(
  submissionUserId: string,
  submissionId: string
): Promise<void> {
  if (!submissionUserId) return;

  try {
    // 1. Check if this invited user has an active pending referral record
    const referralsRef = collection(db, 'referrals');
    const q = query(
      referralsRef,
      where('invitedUid', '==', submissionUserId),
      where('status', '==', 'pending_submission')
    );

    const refSnap = await getDocs(q);
    if (refSnap.empty) {
      return; // No pending referral for this user
    }

    const refDoc = refSnap.docs[0];
    const referralData = refDoc.data();
    const inviterUid = referralData.inviterUid;

    // 2. Mark this referral as completed
    await updateDoc(doc(db, 'referrals', refDoc.id), {
      status: 'completed',
      completedAt: new Date().toISOString(),
      firstSubmissionId: submissionId,
    });

    if (!inviterUid) return;

    // 3. Count total completed referrals for this inviter
    const qCompleted = query(
      referralsRef,
      where('inviterUid', '==', inviterUid),
      where('status', '==', 'completed')
    );
    const completedSnap = await getDocs(qCompleted);
    const totalCompleted = completedSnap.size; // Total successful referrals

    // 4. Check if a milestone of 20 (e.g. 20, 40, 60...) was reached and not yet awarded
    const inviterUserRef = doc(db, 'users', inviterUid);
    await runTransaction(db, async (transaction) => {
      const inviterDoc = await transaction.get(inviterUserRef);
      if (!inviterDoc.exists()) return;

      const inviterData = inviterDoc.data();
      const currentMilestones: number[] = Array.isArray(inviterData.referralRewardMilestones)
        ? inviterData.referralRewardMilestones
        : [];

      // Calculate how many times 20 has been reached
      const earnedMilestonesCount = Math.floor(totalCompleted / 20);
      let bonusToAdd = 0;
      const updatedMilestones = [...currentMilestones];

      for (let m = 1; m <= earnedMilestonesCount; m++) {
        const milestoneThreshold = m * 20;
        if (!updatedMilestones.includes(milestoneThreshold)) {
          updatedMilestones.push(milestoneThreshold);
          bonusToAdd += 10000; // Rp 10.000 per 20 friends
        }
      }

      if (bonusToAdd > 0) {
        const newBalance = (inviterData.balance || 0) + bonusToAdd;
        const newEarned = (inviterData.totalEarned || 0) + bonusToAdd;
        transaction.update(inviterUserRef, {
          balance: newBalance,
          totalEarned: newEarned,
          referralRewardMilestones: updatedMilestones,
        });
      }
    });
  } catch (err) {
    console.warn('Error processing referral bonus on submission accepted:', err);
  }
}
