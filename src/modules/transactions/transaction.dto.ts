import { TransactionType } from './transaction.interface';

export interface CreateTransactionDto {
  value: number;
  type: TransactionType;
  origin?: string;
  destination?: string;
  metadata?: Record<string, any>;
}

