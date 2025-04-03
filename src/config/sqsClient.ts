import { SQSClient } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';

dotenv.config();

const sqsEndpoint = process.env.SQS_ENDPOINT;
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || 'fakeMyKeyId';
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'fakeMySecretAccessKey';

if (!sqsEndpoint) {
  console.warn('SQS_ENDPOINT not found in environment variables. SQS client might not connect.');
}

export const sqsClient = new SQSClient({
  endpoint: sqsEndpoint,
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
  tls: false,
});

console.log(`SQS Client configured for endpoint: ${sqsEndpoint} in region ${awsRegion}`);

export const transactionQueueUrl = process.env.SQS_QUEUE_URL;

if (!transactionQueueUrl && process.env.NODE_ENV !== 'test') {
  console.error('FATAL: SQS_QUEUE_URL environment variable is not set.');
}
