import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  chatwork: {
    apiToken: process.env.CHATWORK_API_TOKEN || '',
    botAccountId: process.env.CHATWORK_BOT_ACCOUNT_ID || '',
    webhookToken: process.env.CHATWORK_WEBHOOK_TOKEN || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  }
};

// Validate required env vars
const requiredVars = [
  'CHATWORK_API_TOKEN',
  'CHATWORK_BOT_ACCOUNT_ID',
  'CHATWORK_WEBHOOK_TOKEN',
  'GEMINI_API_KEY'
];

export const validateEnv = () => {
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
