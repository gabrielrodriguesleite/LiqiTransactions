import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";

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
      schemas: {}
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

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error: ', err.stack)
  res.status(500).json({ message: 'Internal Server Error' })
})

export default app;

