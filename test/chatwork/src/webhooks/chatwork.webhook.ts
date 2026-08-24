import { Request, Response, NextFunction } from 'express';
import { verifySignature } from './chatwork.signature';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const chatworkWebhookMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-chatworkwebhooksignature'] as string;
  
  if (!signature) {
    logger.error('Missing X-ChatworkWebhookSignature header');
    return res.status(401).json({ error: 'Unauthorized: Missing signature' });
  }

  // Lấy rawBody đã được parse bởi express.json({ verify: ... })
  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    logger.error('Missing raw body for signature verification');
    return res.status(500).json({ error: 'Internal server error: Missing raw body' });
  }

  const isValid = verifySignature(rawBody, signature, config.chatwork.webhookToken);

  if (!isValid) {
    logger.error('Invalid signature');
    return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
  }

  next();
};
