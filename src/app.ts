import express from 'express';
import { healthCheck, chatworkWebhook } from './controllers/chatwork.controller';
import { chatworkWebhookMiddleware } from './webhooks/chatwork.webhook';

const app = express();

// Middleware để lưu raw body phục vụ việc tính toán signature
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Route Health check
app.get('/health', healthCheck);

// Route Webhook
app.post('/webhooks/chatwork', chatworkWebhookMiddleware, chatworkWebhook);

export default app;
