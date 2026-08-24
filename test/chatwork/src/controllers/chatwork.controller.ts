import { Request, Response } from 'express';
import { handleChatMessage } from '../handlers/chatwork-message.handler';
import { logger } from '../utils/logger';

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
};

export const chatworkWebhook = async (req: Request, res: Response) => {
  // Chatwork yêu cầu Webhook endpoint trả về 200 OK sớm nhất có thể
  res.status(200).send('OK');

  // Xử lý logic webhook ở background
  try {
    const event = req.body;
    await handleChatMessage(event);
  } catch (error) {
    logger.error('Error in webhook controller', error);
  }
};
