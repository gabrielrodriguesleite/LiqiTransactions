import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

const dynamoEndpoint = process.env.DYNAMODB_ENDPOINT;
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || 'fakeMyKeyId';
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'fakeMySecretAccessKey';

if (!dynamoEndpoint) {
  console.warn('DYNAMODB_ENDPOINT not found in environment variables. DynamoDB client might not connect.');
}

const ddbClient = new DynamoDBClient({
  endpoint: dynamoEndpoint,
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

const marshallOptions = {
  removeUndefinedValues: true,
};
const unmarshallOptions = {
  wrapNumbers: false,
};
const translateConfig = { marshallOptions, unmarshallOptions };

export const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);

console.log(`DynamoDB Document Client configured for endpoint: ${dynamoEndpoint} in region ${awsRegion}`);

export const tableName = process.env.DYNAMODB_TABLE_NAME || 'Transactions';

if (!tableName) {
  console.error('FATAL: DYNAMODB_TABLE_NAME environment variable is not set.');
}
