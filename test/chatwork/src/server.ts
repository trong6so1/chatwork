import app from './app';
import { config, validateEnv } from './config/env';
import { logger } from './utils/logger';

// Bắt lỗi không xác định
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason);
});

const startServer = () => {
  try {
    validateEnv();
    app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Webhook endpoint: POST /webhooks/chatwork`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
