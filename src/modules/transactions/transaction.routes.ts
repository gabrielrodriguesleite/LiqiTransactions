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
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/CreateTransaction' # Referencia o schema definido em app.ts
 *    responses:
 *      '201':
 *        description: Transação recebida e enfileirada com sucesso. Retorna a transação criada com status 'pending'.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Transaction' # Referencia o schema Transaction
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

/**
 * @openapi
 * /transactions:
 *  get:
 *    tags:
 *    - Transactions
 *    summary: Consulta transações por período.
 *    description: Retorna uma lista de transações filtradas por data de início e/ou fim. A consulta por período pode ser ineficiente sem índices adequados no banco de dados (GSI recomendado).
 *    parameters:
 *    - in: query
 *      name: startDate
 *      schema:
 *        type: string
 *        format: date # Ou date-time se aceitar hora
 *        required: false
 *      description: Data de início (inclusive) para filtrar transações (Formato YYYY-MM-DD ou ISO 8601).
 *    - in: query
 *      name: endDate
 *      schema:
 *        type: string
 *        format: date # Ou date-time
 *      required: false
 *      description: Data de fim (inclusive) para filtrar transações (Formato YYYY-MM-DD ou ISO 8601).
 *    responses:
 *      '200':
 *      description: Lista de transações encontradas no período.
 *      content:
 *        application/json:
 *          schema:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Transaction'
 *      '400':
 *        description: Formato inválido para startDate ou endDate.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 *      '500':
 *        description: Erro interno do servidor ao consultar transações.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', transactionController.getTransactionsByPeriod);

/**
 * @openapi
 * /transactions/{id}:
 *  get:
 *    tags:
 *    - Transactions
 *    description: Retorna os detalhes completos de uma única transação financeira pelo seu ID único.
 *    parameters:
 *    - in: path
 *      name: id
 *      schema:
 *        type: string
 *        format: uuid
 *      required: true
 *      description: O ID único da transação a ser consultada.
 *    responses:
 *      '200':
 *        description: Detalhes da transação encontrada.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Transaction'
 *      '404':
 *        description: Transação com o ID especificado não encontrada.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 *      '500':
 *        description: Erro interno do servidor ao consultar a transação.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', transactionController.getTransactionById);

/**
 * @openapi
 * /transactions/{id}/status:
 *   get:
 *     tags:
 *     - Transactions
 *     description: Retorna apenas o status atual ('pending', 'processing', 'completed', 'failed') de uma transação específica pelo seu ID.
 *     parameters:
 *     - in: path
 *       name: id
 *       schema:
 *         type: string
 *         format: uuid
 *       required: true
 *       description: O ID único da transação para consultar o status.
 *     responses:
 *       '200':
 *         description: Status atual da transação.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionStatusResponse' # Schema específico para status
 *       '404':
 *         description: Transação com o ID especificado não encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Erro interno do servidor ao consultar o status.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/status', transactionController.getTransactionStatus);

export default router;
