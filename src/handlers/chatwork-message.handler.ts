import { chatworkService } from '../services/chatwork.service';
import { geminiService } from '../services/gemini.service';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// In-memory set lưu trữ các webhook event id đã xử lý để tránh duplicate
// Lưu ý: Chỉ dùng cho Local/MVP. Trên Production nên dùng Redis.
const processedEvents = new Set<string>();

export const handleChatMessage = async (event: any) => {
  try {
    const eventType = event.webhook_event_type;
    const webhookEventId = event.webhook_event_id; // Chatwork có thể cung cấp ID trên header hoặc webhook_event, nhưng giả sử chúng ta tạo một unique ID từ event
    
    // Tạo ID duy nhất cho event (room_id + message_id)
    const roomId = event.webhook_event.room_id.toString();
    const messageId = event.webhook_event.message_id.toString();
    const fromAccountId = event.webhook_event.account_id.toString();
    const body = event.webhook_event.body;
    
    const uniqueEventId = `${roomId}-${messageId}`;

    logger.info(`[WEBHOOK] Event received. Type: ${eventType}, Room: ${roomId}, Message ID: ${messageId}`);

    // 1. Duplicate protection
    if (processedEvents.has(uniqueEventId)) {
      logger.info(`[WEBHOOK] Duplicate event ignored: ${uniqueEventId}`);
      return;
    }
    processedEvents.add(uniqueEventId);
    
    // Giới hạn size set in-memory (ví dụ giữ 1000 item gần nhất)
    if (processedEvents.size > 1000) {
      const firstItem = processedEvents.values().next().value;
      if (firstItem) {
        processedEvents.delete(firstItem);
      }
    }

    // 2. Lọc sự kiện (Chỉ xử lý tin nhắn mới)
    if (eventType !== 'message_created') {
      logger.info(`[WEBHOOK] Ignored event type: ${eventType}`);
      return;
    }

    // 3. Bot identification (Lọc tin nhắn do chính bot gửi - chống loop)
    if (fromAccountId === config.chatwork.botAccountId) {
      logger.info(`[BOT] Is bot: true. Ignoring own message to prevent loop.`);
      return;
    }

    // 4. Detect TO Bot / Reply Bot
    const isMention = chatworkService.isBotMentioned(body, config.chatwork.botAccountId);
    
    if (!isMention) {
      logger.info(`[BOT] Is mention/reply: false. Normal message ignored.`);
      return;
    }

    logger.info(`[BOT] Is mention/reply: true. Processing...`);

    // 5. Làm sạch message body (loại bỏ phần tag TO/Reply) trước khi gửi Gemini
    const cleanPrompt = chatworkService.cleanMessageBody(body, config.chatwork.botAccountId);

    if (!cleanPrompt) {
       logger.info(`[BOT] Message is empty after cleaning. Ignored.`);
       return;
    }

    // 6. Gọi Gemini AI
    const aiResponse = await geminiService.generateResponse(cleanPrompt);

    // 7. Format câu trả lời trả về dạng Reply người dùng
    const finalResponse = `[rp aid=${fromAccountId} to=${roomId}-${messageId}]\n${aiResponse}`;

    // 8. Gửi lại lên Chatwork
    await chatworkService.sendMessage(roomId, finalResponse);

  } catch (error: any) {
    logger.error('[HANDLER] Error handling chat message', error);
  }
};
