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
  },
  conversation: {
    maxMessages: parseInt(process.env.MAX_CONVERSATION_MESSAGES || '20', 10),
    ttlMinutes: parseInt(process.env.CONVERSATION_TTL_MINUTES || '0', 10), // 0 = không timeout
    debugGeminiContext: process.env.DEBUG_GEMINI_CONTEXT === 'true',
    storageFile: process.env.CONVERSATION_STORAGE_FILE || 'data/conversations.json',
  }
};

// Validate required env vars
const requiredVars = [
  'CHATWORK_API_TOKEN',
  'CHATWORK_BOT_ACCOUNT_ID',
  'CHATWORK_WEBHOOK_TOKEN',
  'GEMINI_API_KEY'
];

// Validate conversation config
if (isNaN(config.conversation.maxMessages) || config.conversation.maxMessages < 1) {
  throw new Error('MAX_CONVERSATION_MESSAGES must be a positive integer');
}

export const validateEnv = () => {
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
