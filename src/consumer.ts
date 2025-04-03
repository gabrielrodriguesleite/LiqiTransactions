import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { sqsClient, transactionQueueUrl } from './config/sqsClient';
import { TransactionService } from './modules/transactions/transaction.service';
import { Transaction, TransactionStatus, TransactionType } from './modules/transactions/transaction.interface';

const transactionService = new TransactionService();

const WAIT_TIME_SECONDS = 10;
const MAX_MESSAGES = 5;

/**
 * Processa uma única mensagem da fila SQS.
 * @param message A mensagem SQS recebida.
 */
async function processMessage(message: Message): Promise<void> {
  console.log(`[Consumer] Received message with ID: ${message.MessageId}`);
  let transaction: Transaction | null = null;

  try {
    if (!message.Body) {
      throw new Error('Message body is empty.');
    }

    transaction = JSON.parse(message.Body) as Transaction;
    if (!transaction || !transaction.id || !transaction.value) {
      throw new Error('Invalid transaction format in message body.');
    }
    console.log(`[Consumer] Processing transaction ID: ${transaction.id}`);

    // validações
    console.log(`[Consumer] Validating transaction ${transaction.id}`);
    const validationErrors: string[] = [];

    // regra 1: valor deve ser positivo
    if (typeof transaction.value !== 'number' || transaction.value <= 0) {
      validationErrors.push('Value must me a positive number.');
    }

    // regra 2: tipo deve ser 'credit' ou 'debit'
    if (transaction.type !== TransactionType.CREDIT && transaction.type !== TransactionType.DEBIT) {
      validationErrors.push(`Invalid transaction tye: '${transaction.type}'. Must be '${TransactionType.CREDIT}' or '${TransactionType.DEBIT}' `)
    }

    // regra 3: 'origin' obrigatório para 'debit'
    if (transaction.type === TransactionType.DEBIT && (!transaction.origin || typeof transaction.origin !== 'string' || transaction.origin.trim() === '')) {
      validationErrors.push('Origin account is required for debit transactions.')
    }

    // regra 4: 'destination' obrigatório para 'credit'
    if (transaction.type === TransactionType.CREDIT && (!transaction.destination || typeof transaction.destination !== 'string' || transaction.destination.trim() === '')) {
      validationErrors.push('Destination account is required for credit transactions.')
    }

    if (validationErrors.length > 0) {
      const errorMessage = `Validation Failed? ${validationErrors.join('; ')}`
      console.error(`[Consumer] ${errorMessage} for transaction ${transaction.id}`)
      throw new Error(errorMessage)
    }

    console.log(`[Consumer] Transaction ${transaction.id} validation passed.`)

    await transactionService.updateTransactionStatus(transaction.id, TransactionStatus.PROCESSING);

    console.log(`[Consumer] Simulating processing for transaction ${transaction.id}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (Math.random() < 0.1) {
      throw new Error(`Simulated processing failure for transaction ${transaction.id}`);
    }

    await transactionService.updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED);
    console.log(`[Consumer] Transaction ${transaction.id} processed successfully.`);

  } catch (error: any) {
    console.error(`[Consumer] Error processing message ${message.MessageId} for transaction ${transaction?.id || 'unknown'}:`, error.message);
    if (transaction && transaction.id) {
      try {
        await transactionService.updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
        console.log(`[Consumer] Transaction ${transaction.id} status set to FAILED.`);
      } catch (updateError) {
        console.error(`[Consumer] Failed to update status to FAILED for transaction ${transaction.id}:`, updateError);
      }
    }
  } finally {
    if (message.ReceiptHandle) {
      try {
        const deleteCommand = new DeleteMessageCommand({
          QueueUrl: transactionQueueUrl!,
          ReceiptHandle: message.ReceiptHandle,
        });
        await sqsClient.send(deleteCommand);
        console.log(`[Consumer] Message ${message.MessageId} deleted from queue.`);
      } catch (deleteError) {
        console.error(`[Consumer] Failed to delete message ${message.MessageId}:`, deleteError);
      }
    } else {
      console.warn(`[Consumer] Message ${message.MessageId} has no ReceiptHandle. Cannot delete.`);
    }
  }
}

async function pollQueue(): Promise<void> {
  console.log(`[Consumer] Starting poll cycle... Waiting up to ${WAIT_TIME_SECONDS}s for messages.`);

  if (!transactionQueueUrl) {
    console.error('[Consumer] SQS Queue URL is not configured. Stopping consumer.');
    return;
  }

  try {
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: transactionQueueUrl,
      MaxNumberOfMessages: MAX_MESSAGES,
      WaitTimeSeconds: WAIT_TIME_SECONDS,
      VisibilityTimeout: 30
    });

    const response = await sqsClient.send(receiveCommand);

    if (response.Messages && response.Messages.length > 0) {
      console.log(`[Consumer] Received ${response.Messages.length} messages.`);
      for (const message of response.Messages) {
        await processMessage(message);
      }
    } else {
      console.log('[Consumer] No messages received in this poll cycle.');
    }
  } catch (error) {
    console.error('[Consumer] Error polling SQS queue:', error);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos
  } finally {
    setImmediate(pollQueue);
  }
}

console.log('[Consumer] Starting SQS Consumer...');
pollQueue();

process.on('SIGTERM', () => {
  console.info('[Consumer] SIGTERM signal received. Shutting down gracefully.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.info('[Consumer] SIGINT signal received. Shutting down gracefully.');
  process.exit(0);
});
