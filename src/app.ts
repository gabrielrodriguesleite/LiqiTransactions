import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

dotenv.config()

const app: Application = express()

app.use(express.json())


app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() })
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error: ', err.stack)
  res.status(500).json({ message: 'Internal Server Error' })
})

export default app;

