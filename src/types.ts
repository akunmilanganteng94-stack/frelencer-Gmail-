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
}

export type SubmissionStatus = 'Pending' | 'Diterima' | 'Ditolak';

export interface Submission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  dataContent: string;
  rewardAmount: number;
  status: SubmissionStatus;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
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
  claimedAt?: string;
  usedAt?: string;
  createdAt?: string;
}

export interface SystemSettings {
  storanOpen: boolean;
  storanSchedule: string;
  pricePerSubmission: number;
  withdrawalOpen: boolean;
  minWithdrawal: number;
  rules: string[];
  announcement: string;
  gmailDefaultPassword?: string;
  generatorOpen: boolean;
  adminWhatsApp?: string;
  dailyGenerateLimit: number;
  storanClosedReason?: string;
}

export type NavigationTab = 'home' | 'storan' | 'riwayat' | 'saldo' | 'akun' | 'admin' | 'rules';

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
