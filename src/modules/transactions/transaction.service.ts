import { randomUUID } from 'crypto';
import { Transaction, TransactionStatus } from './transaction.interface';
import { CreateTransactionDto } from './transaction.dto';
import { sqsClient, transactionQueueUrl } from '../../config/sqsClient';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { ddbDocClient, tableName } from '../../config/dynamoClient';

// const transactionsStore: Map<string, Transaction> = new Map();

export class TransactionService {

  async processNewTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    console.log('[Service] Received new transaction request:', dto);

    const newTransaction: Transaction = {
      id: randomUUID(),
      value: dto.value,
      type: dto.type,
      origin: dto.origin,
      destination: dto.destination,
      timestamp: new Date(),
      status: TransactionStatus.PENDING,
      metadata: dto.metadata,
    };

    try {
      const itemToSave = {
        ...newTransaction,
        timestamp: newTransaction.timestamp.toISOString(), // fix para o formato aceito pelo DynamoDB
        gsi1pk: "TRANSACTION",
      }
      const putCommand = new PutCommand({
        TableName: tableName,
        Item: itemToSave,
      })
      await ddbDocClient.send(putCommand)
      console.log(`[Service] Transaction ${newTransaction.id} saved to DynamoDB with status PENDING`);
    } catch (error) {
      console.error(`[Service] Error saving transaction ${newTransaction.id} to Database:`, error)
      throw new Error('Failed to save initial transaction state.')
    }

    if (!transactionQueueUrl) {
      console.error('[Service] SQS Queue URL is not configured. Cannot send message.')
      throw new Error('Queue configuration error.')
    }

    try {
      const messageBody = JSON.stringify(newTransaction);
      console.log('[APENAS PARA TESTE] - transactionQueueUrl: ', transactionQueueUrl)
      const sqsCommand = new SendMessageCommand({
        QueueUrl: transactionQueueUrl,
        MessageBody: messageBody,
      })

      const sqsResponse = await sqsClient.send(sqsCommand)
      console.log(`Transaction ${newTransaction.id} sent to SQS queue. MessageId: ${sqsResponse.MessageId}`)

    } catch (error) {
      console.error(`Error sending transaction ${newTransaction.id} to SQS:`, error)
      throw new Error('Failed to queue transaction for processing after saving.')
    }

    return newTransaction;
  }

  async findTransactionById(id: string): Promise<Transaction | null> {
    console.log(`[Service] Searching for transaction by ID: ${id}`);
    try {
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: { id: id },
      });
      const response = await ddbDocClient.send(getCommand);
      if (response.Item) {
        const item = response.Item;
        if (item.timestamp && typeof item.timestamp === 'string') {
          item.timestamp = new Date(item.timestamp)
        }
        return item as Transaction;
      }
      return null;

    } catch (error) {
      console.error(`[Service] Error fetching transaction ${id} from DynamoDB:`, error)
      throw new Error('Database fetch error.')
    }
  }

  async findTransactionsByPeriod(startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    console.log(`[Service] Querying DynamoDB using GSI 'TimestampIndex' between ${startDate} and ${endDate}.`)
    let keyCondition = '#pk = :pkValue';
    const attibuteNames: Record<string, string> = { '#pk': 'gsi1pk' };
    const attributeValues: Record<string, any> = { ':pkValue': 'TRANSACTION' }

    if (startDate && endDate) {
      keyCondition += ' AND #ts BETWEEN :startTs AND :endTs';
      attibuteNames['#ts'] = 'timestamp';
      attributeValues[':startTs'] = startDate.toISOString()
      attributeValues[':endDate'] = endDate.toISOString()
    } else if (startDate) {
      keyCondition += ' AND #ts >= :startTs'
      attibuteNames['#ts'] = 'timestamp';
      attributeValues[':startTs'] = startDate.toISOString()
    } else if (endDate) {
      keyCondition += ' AND #ts <= :endTs';
      attibuteNames['#ts'] = 'timestamp';
      attributeValues[':endTs'] = endDate.toISOString()
    }

    try {
      const queryCommand = new QueryCommand({
        TableName: tableName,
        IndexName: 'TimestampIndex', // GSI a ser usado 
        KeyConditionExpression: keyCondition,
        ExpressionAttributeNames: attibuteNames,
        ExpressionAttributeValues: attributeValues,
        ScanIndexForward: false // mais recente para o mais antigo
      })
      const response = await ddbDocClient.send(queryCommand)
      const items = (response.Items || []) as any[]
      const transations: Transaction[] = items.map(item => {
        if (item.timestamp && typeof item.timestamp === 'string') {
          item.timestamp = new Date(item.timestamp)
        }
        delete item.gsi1pk
        return item as Transaction
      })
      return transations;

    } catch (error) {
      console.error('[Service] Error querying transactions from DynamoDB GSI:', error)
      throw new Error('Database query error.')
    }
  }

  async findTransactionStatus(id: string): Promise<{ status: TransactionStatus } | null> {
    console.log(`[Service] Searching DynamoDB for status of transaction ID: ${id}`);

    try {
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: { id: id },
        ProjectionExpression: '#s', // pede apenas o atributo 'status'
        ExpressionAttributeNames: { '#s': 'status' } // mapeia '#s' para 'status' (evita palavras reservadas)
      })
      const response = await ddbDocClient.send(getCommand)
      if (response.Item) {
        return { status: response.Item.status as TransactionStatus }
      }
      return null;

    } catch (error) {
      console.error(`[Service] Error fetching status for transaction ${id} from DynamoDB:`, error);
      throw new Error('Database fetch error.');
    }
  }

  async updateTransactionStatus(id: string, status: TransactionStatus): Promise<boolean> {
    console.log(`[Service] Updating status for transaction ${id} to ${status} in DynamoDB.`)
    try {
      const updateCommand = new UpdateCommand({
        TableName: tableName,
        Key: { id: id },
        UpdateExpression: 'SET #s = :newStatus', // define o atributo 'status'
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':newStatus': status },
        ConditionExpression: 'attibute_exists(id)',
        ReturnValues: 'NONE',
      })
      await ddbDocClient.send(updateCommand);
      console.log(`[Service] Successfully updated status for transaction ${id} to ${status}.`)
      return true

    } catch (error) {
      console.error(`[Service] Error updating status for transaction ${id} in DynamoDB:`, error)
      throw new Error('Database update error.')
    }
  }
}
