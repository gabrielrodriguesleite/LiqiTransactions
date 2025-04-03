import { Router } from 'express';
import { TransactionController } from './transaction.controller';

const router = Router();
const transactionController = new TransactionController();

/**
 * @openapi
 * /transactions:
 *  post:
 *    tags:
 *      - Transactions
 *    summary: Cria uma nova transação financeira.
 *    description: Recebe os detalhes de uma nova transação, a salva com status 'pending' e a enfileira para processamento assíncrono.
 *    requestBody:
 *    required: true
 *    content:
 *      application/json:
 *      schema:
 *        $ref: '#/components/schemas/CreateTransaction' # Referencia o schema definido em app.ts
 *    responses:
 *      '201':
 *      description: Transação recebida e enfileirada com sucesso. Retorna a transação criada com status 'pending'.
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Transaction' # Referencia o schema Transaction
 *      '400':
 *        description: Erro de validação nos dados de entrada.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 *      '500':
 *        description: Erro interno do servidor ao processar a requisição.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getTransactionsByPeriod);
router.get('/:id', transactionController.getTransactionById);
router.get('/:id/status', transactionController.getTransactionStatus);

export default router;
