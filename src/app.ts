import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import transactionRoutes from "./modules/transactions/transaction.routes";

dotenv.config()

const app: Application = express()

app.use(express.json())

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Financial Transaction Processing API',
      version: '1.0.0',
      description: 'API para receber e consultar transações financeiras (Desafio Liqi).',
      contact: {
        name: 'Gabriel Rodrigues Leite',
        mailme: 'k.cogabriel at gmail dot com',
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: 'Servidor de Desenvolvimento Local'
      }
    ],
    components: {
      schemas: {
        Transacrion: {
          type: 'object',
          required: ['id', 'value', 'type', 'timestamp', 'status'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'ID único da transação' },
            value: { type: 'number', format: 'float', description: 'Valor da transação' },
            type: { type: 'string', emum: ['credit', 'debit'], description: 'Tipo de transação' },
            origin: { type: 'string', description: 'Conta de origem (para débitos)' },
            destination: { type: 'string', description: 'Conta de destino (para créditos)' },
            timestamp: { type: 'string', format: 'data-time', description: 'Data/Hora de transação' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'], description: 'Status do processamento' },
            metadata: { type: 'object', additionalProperties: true, description: 'Metadados adicionais (opcional)' },
          },
          example: {
            id: 'a1b2c3d40e5f6-7890-1234-abcdef123456',
            value: 150.75,
            type: 'debit',
            origin: 'conta-origem-456',
            destination: 'conta-destino-789',
            timestamp: '2025-04-03T14:30:00.123Z',
            status: 'compelted',
            metadata: { productId: 'prod-abc' }
          }
        },
        CreateTransaction: {
          type: 'object',
          required: ['value', 'type'],
          properties: {
            value: { type: 'number', format: 'float', minimum: 0.01, description: 'Valor da transação (deve ser positivo)' },
            type: { type: 'string', enum: ['credit', 'debit'], description: 'Tipo da transação' },
            origin: { type: 'string', description: 'Conta de origem (obrigatório para débitos)' },
            destination: { type: 'string', description: 'Conta de destino (obrigatório para créditos)' },
            metadata: { type: 'object', additionalProperties: true, description: 'Metadados adicionais (opcional)' }
          },
          example: {
            value: 55.00,
            type: 'credit',
            destination: 'acc-xyz-987'
          }
        },
        TransactionStatusResponse: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'], description: 'Status atual do processamento' },
          },
          example: {
            status: 'processing'
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Mensagem descrevendo o erro' }
          },
          example: {
            message: 'Transaction not found'
          }
        }
      }
    }
  },
  apis: [
    path.join(__dirname, './app.ts'),
  ]
}

const swaggerSpec = swaggerJSDoc(swaggerOptions)
// const { paths } = swaggerSpec as { paths: string[] }
// console.log('[Swagger Spec Check] Paths found', JSON.stringify(paths, null, 2))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/api-docs.json', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
* @openapi
* /health:
*   get:
*     tags:
*     - Health 
*     summary: verifica a saúde da API 
*     description: Retorna o status atual da aplicação e o timestamp.
*     responses:
*       200:
*         description: API está operacional.
*     content:
*       application/json 
*     schema:
*       type: object 
*     properties:
*       status: 
*         type: string 
*         example: UP 
*       timestamp:
*         type: string 
*         format: date-time
*/
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() })
})

app.use('/api/v1/transactions', transactionRoutes)

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error: ', err.stack)
  res.status(500).json({ message: 'Internal Server Error' })
})

export default app;

