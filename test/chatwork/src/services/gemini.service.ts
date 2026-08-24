import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  private getSystemPrompt(): string {
    return `Bạn là AI Assistant hoạt động trong hệ thống nhóm chat Chatwork.
Hãy trả lời người dùng theo các nguyên tắc sau:
- Chính xác và chuyên nghiệp.
- Ngắn gọn, súc tích (do Chatwork không phù hợp với các tin nhắn quá dài).
- Dễ hiểu, format rõ ràng bằng cách dùng dấu (*) hoặc (-) cho gạch đầu dòng.
- Hữu ích và đi thẳng vào trọng tâm.
- Nếu bạn không biết hoặc không chắc chắn, hãy nói rõ là bạn không biết.
- Nếu câu hỏi có vẻ như đang hỏi về code, hãy format code rõ ràng.`;
  }

  public async generateResponse(message: string): Promise<string> {
    try {
      logger.info('[GEMINI] Request started');
      
      const model = this.genAI.getGenerativeModel({ 
        model: config.gemini.model
      });

      const fullPrompt = `${this.getSystemPrompt()}\n\n---\nCâu hỏi của người dùng:\n${message}`;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info('[GEMINI] Request completed');
      return text;
    } catch (error: any) {
      logger.error('[GEMINI] Request failed', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
