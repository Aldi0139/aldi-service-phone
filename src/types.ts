export type UserRole = 'Owner' | 'Kasir' | 'Teknisi';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceJob {
  id: string;
  customerName: string;
  customerPhone: string;
  phoneBrand: string;
  phoneModel: string;
  imei: string;
  issue: string;
  estimatedCost: number;
  capitalCost: number;
  price: number;
  profit: number;
  entryDate: Date;
  pickupDate?: Date | null;
  technician: string;
  notes: string;
  status: 'Proses' | 'Menunggu Sparepart' | 'Selesai' | 'Sudah Diambil';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PpobRecord {
  id: string;
  shiftName: string;
  transactionCount: number;
  sellingPrice: number;
  cashWithdrawal: number;
  incomingBalance: number;
  startingBalance: number;
  endingBalance: number;
  basicPrice: number;
  fee: number;
  physicalBalance: number;
  status: 'Normal' | 'Fee Terlalu Rendah' | 'Fee Terlalu Tinggi';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
