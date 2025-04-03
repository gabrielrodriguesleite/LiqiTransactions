export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export interface Transaction {
  id: string;
  value: number;
  type: TransactionType;
  origin?: string;
  destination?: string;
  timestamp: Date;
  status: TransactionStatus;
  metadata?: Record<string, any>;
}
