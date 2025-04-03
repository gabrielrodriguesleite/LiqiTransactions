import { Request, Response, NextFunction } from 'express';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './transaction.dto';
import { TransactionType } from './transaction.interface';

export class TransactionController {
  private transactionService = new TransactionService();

  createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: CreateTransactionDto = req.body;
      if (!dto.value || !dto.type || !Object.values(TransactionType).includes(dto.type)) {
        res.status(400).json({ message: 'Invalid input: value and type (credit/debit) are required.' });
        return;
      }
      if (typeof dto.value !== 'number' || dto.value <= 0) {
        res.status(400).json({ message: 'Invalid input: value must be a positive number.' });
        return;
      }


      const newTransaction = await this.transactionService.processNewTransaction(dto);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      next(error);
    }
  };

  getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const transaction = await this.transactionService.findTransactionById(id);
      if (transaction) {
        res.status(200).json(transaction);
      } else {
        res.status(404).json({ message: 'Transaction not found' });
      }
    } catch (error) {
      console.error("Error getting transaction by id:", error);
      next(error);
    }
  };

  getTransactionsByPeriod = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      if (start && isNaN(start.getTime())) {
        res.status(400).json({ message: 'Invalid startDate format.' });
        return;
      }
      if (end && isNaN(end.getTime())) {
        res.status(400).json({ message: 'Invalid endDate format.' });
        return;
      }


      const transactions = await this.transactionService.findTransactionsByPeriod(start, end);
      res.status(200).json(transactions);
    } catch (error) {
      console.error("Error getting transactions by period:", error);
      next(error);
    }
  };

  getTransactionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const statusResult = await this.transactionService.findTransactionStatus(id);
      if (statusResult) {
        res.status(200).json(statusResult);
      } else {
        res.status(404).json({ message: 'Transaction not found' });
      }
    } catch (error) {
      console.error("Error getting transaction status:", error);
      next(error);
    }
  };
}
