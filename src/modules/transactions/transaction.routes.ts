import { Router } from 'express';
import { TransactionController } from './transaction.controller';

const router = Router();
const transactionController = new TransactionController();

router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getTransactionsByPeriod);
router.get('/:id', transactionController.getTransactionById);
router.get('/:id/status', transactionController.getTransactionStatus);

export default router;
