import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class ChatworkService {
  private readonly baseUrl = 'https://api.chatwork.com/v2';
  private readonly headers = {
    'X-ChatworkToken': config.chatwork.apiToken,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  /**
   * Kiểm tra xem bot có được nhắc đến (TO) hoặc Reply hay không
   */
  public isBotMentioned(body: string, botAccountId: string): boolean {
    const toMention = `[To:${botAccountId}]`;
    const replyMention = `[rp aid=${botAccountId}`;
    
    return body.includes(toMention) || body.includes(replyMention);
  }

  /**
   * Gửi tin nhắn vào room
   */
  public async sendMessage(roomId: string, message: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/rooms/${roomId}/messages`;
      const data = new URLSearchParams();
      data.append('body', message);

      logger.info(`[CHATWORK] Sending response to room ${roomId}`);
      
      const response = await axios.post(url, data, { headers: this.headers });
      
      logger.info(`[CHATWORK] Response completed. Message ID: ${response.data.message_id}`);
    } catch (error: any) {
      logger.error(`[CHATWORK] Failed to send message to room ${roomId}`, error.response?.data || error);
      throw error;
    }
  }
  
  /**
   * Lọc bỏ phần tag mention của bot để chuỗi string sạch hơn gửi cho Gemini
   */
  public cleanMessageBody(body: string, botAccountId: string): string {
    const toRegex = new RegExp(`\\[To:${botAccountId}\\][^\n]*\n?`, 'g');
    const rpRegex = new RegExp(`\\[rp aid=${botAccountId}[^\\]]*\\][^\n]*\n?`, 'g');
    
    return body.replace(toRegex, '').replace(rpRegex, '').trim();
  }
}

export const chatworkService = new ChatworkService();
