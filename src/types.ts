export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawn: number;
  status: UserStatus;
  createdAt: string;
  generatedEmails?: string[];
  referralCode?: string;
  referredBy?: string;
  referredByCode?: string;
  inviterName?: string;
  totalInvited?: number;
  referralRewardMilestones?: number[];
}

export type ReferralStatus = 'pending_submission' | 'completed';

export interface ReferralItem {
  id: string;
  inviterUid: string;
  inviterEmail: string;
  invitedUid: string;
  invitedEmail: string;
  invitedName: string;
  referralCodeUsed?: string;
  status: ReferralStatus;
  createdAt: string;
  completedAt?: string;
  firstSubmissionId?: string;
}

export type SubmissionStatus = 'Pending' | 'Cek Admin' | 'Diterima' | 'Ditolak';

export interface Submission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  dataContent: string;
  rewardAmount: number;
  status: SubmissionStatus;
  submissionType?: string;
  rejectionReason?: string;
  adminNotes?: string;
  passwordUsed?: string;
  createdAt: string;
  reviewedAt?: string;
  checkedAt?: string;
}

export type WithdrawalMethod = 'DANA' | 'GoPay';
export type WithdrawalStatus = 'Pending' | 'Selesai' | 'Ditolak';

export interface Withdrawal {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  method: WithdrawalMethod;
  targetNumber: string;
  recipientName: string;
  status: WithdrawalStatus;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GmailStockItem {
  id: string;
  email: string;
  password?: string;
  status: 'available' | 'used';
  addedAt: string;
  claimedBy?: string;
  claimedByName?: string;
  claimedByEmail?: string;
  claimedAt?: string;
  usedAt?: string;
  createdAt?: string;
}

export interface SystemSettings {
  storanOpen: boolean;
  storanSchedule: string;
  pricePerSubmission: number;
  withdrawalOpen: boolean;
  withdrawalDanaOpen?: boolean;
  withdrawalGopayOpen?: boolean;
  passwordZero1122Open?: boolean;
  passwordPrabujayaOpen?: boolean;
  password1Name?: string;
  password2Name?: string;
  passwordList?: string[];
  minWithdrawal: number;
  rules: string[];
  announcement: string;
  gmailDefaultPassword?: string;
  generatorOpen: boolean;
  adminWhatsApp?: string;
  dailyGenerateLimit: number;
  storanClosedReason?: string;
  apkDownloadUrl?: string;
}

export type NavigationTab =
  | 'home'
  | 'storan'
  | 'riwayat'
  | 'saldo'
  | 'akun'
  | 'admin'
  | 'rules'
  | 'referral';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
