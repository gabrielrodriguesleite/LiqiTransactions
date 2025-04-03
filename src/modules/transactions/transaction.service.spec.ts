import { ddbDocClient, tableName } from '../../config/dynamoClient'
import { TransactionService } from './transaction.service'
import { CreateTransactionDto } from './transaction.dto'
import { TransactionStatus, TransactionType } from './transaction.interface'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { sqsClient } from '../../config/sqsClient'

jest.mock('../../config/sqsClient.ts', () => ({
  sqsClient: { send: jest.fn() },
  transactionQueueUrl: 'mock-queue-url-for-testing'
}))
jest.mock('../../config/dynamoClient.ts', () => ({
  ddbDocClient: { send: jest.fn() },
  tableName: 'mock-table-name-for-testing'
}))
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid-1234')
}))

const mockSqsSend = jest.fn()
const mockDdbSend = jest.fn()

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDdbSend.mockResolvedValue({}) // para Put, Update, Delete
    mockSqsSend.mockResolvedValue({ MessageId: 'mock-sqs-message-id' }) // para SendMessage
    sqsClient.send = mockSqsSend
    ddbDocClient.send = mockDdbSend

    transactionService = new TransactionService();
  })

  describe('Test processNewTransaction', () => {
    it('should save transaction to DynamoDB, send to SQS, and return the transaction on success', async () => {
      // Arrange
      const dto: CreateTransactionDto = {
        value: 100.50,
        type: TransactionType.CREDIT,
        destination: 'account-abc',
        metadata: { test: 'data' }
      }

      // Act 
      const result = await transactionService.processNewTransaction(dto)

      // Assert
      //
      // 1. Verifica se o resultado tem a estrutura esperada
      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        value: dto.value,
        type: dto.type,
        destination: dto.destination,
        metadata: dto.metadata,
        status: TransactionStatus.PENDING,
        timestamp: expect.any(Date)
      }))

      // 2. Verifica a chamada ao DynamoDB (PutCommand)
      expect(mockDdbSend).toHaveBeenCalledTimes(1);
      expect(mockDdbSend).toHaveBeenCalledWith(expect.any(PutCommand))
      const putCommandInput = mockDdbSend.mock.calls[0][0].input; // args da primeria call 
      expect(putCommandInput.TableName).toBe(tableName)
      expect(putCommandInput.Item).toEqual(expect.objectContaining({
        id: result.id,
        value: dto.value,
        type: dto.type,
        origin: dto.origin,
        destination: dto.destination,
        metadata: dto.metadata,
        status: TransactionStatus.PENDING,
        timestamp: result.timestamp.toISOString(),
        gsi1pk: 'TRANSACTION',
      }))

      // 3. Verifica a chamada ao SQS (SendMessageCommand)
      expect(mockSqsSend).toHaveBeenCalledTimes(1);
      expect(mockSqsSend).toHaveBeenCalledWith(expect.any(SendMessageCommand))
      const sendMessageCommandInput = mockSqsSend.mock.calls[0][0].input;
      expect(sendMessageCommandInput.QueueUrl).toBe('mock-queue-url-for-testing')
      const messageBody = JSON.parse(sendMessageCommandInput.MessageBody)
      expect(messageBody).toEqual({
        ...result,
        timestamp: result.timestamp.toISOString()
      })
    })

    it('should throw an error if saving to DynamoDB fails', async () => {
      //Arrange 
      const dto: CreateTransactionDto = { value: 50, type: TransactionType.DEBIT, origin: 'abc-123' }
      const dynamoError = new Error('DynamoDB Put Failed')
      mockDdbSend.mockRejectedValueOnce(dynamoError) // falha simulada

      // Act & Assert
      await expect(transactionService.processNewTransaction(dto))
        .rejects
        .toThrow('Failed to save initial transaction state.')

      expect(mockSqsSend).not.toHaveBeenCalled()
    })

    it('should throw an error if sending to SQS fails', async () => {
      //Arrange 
      const dto: CreateTransactionDto = { value: 50, type: TransactionType.DEBIT, origin: 'abc-123' }
      const sqsError = new Error('SQS Send Failed')
      mockSqsSend.mockRejectedValueOnce(sqsError)

      // Act & Assert 
      await expect(transactionService.processNewTransaction(dto))
        .rejects
        .toThrow('Failed to queue transaction for processing after saving.')

      expect(mockDdbSend).toHaveBeenCalledTimes(1)
    })
  })
})
