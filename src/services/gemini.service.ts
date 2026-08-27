import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { conversationStore, ConversationMessage } from './conversation.store';

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  private getSystemPrompt(): string {
    return `Bạn là AI Assistant hoạt động trong hệ thống nhóm chat Chatwork.

    Hãy trả lời theo phong cách:
    - Ngắn gọn, súc tích, đi thẳng vào vấn đề.
    - Vui vẻ, hài hước, hơi lầy một chút 😎.
    - Có thể pha trò hoặc cà khịa nhẹ khi phù hợp, nhưng không toxic, không xúc phạm người dùng.
    - Ưu tiên cách nói tự nhiên như đang trò chuyện với đồng nghiệp.
    - Không viết dài dòng. Nếu có thể trả lời trong vài câu thì đừng viết thành bài văn.
    - Với câu hỏi đơn giản, trả lời nhanh và gọn.
    - Với câu hỏi kỹ thuật, vẫn phải chính xác nhưng giải thích dễ hiểu, tránh "giảng đạo" quá dài.
    - Nếu không biết hoặc không chắc chắn, hãy nói rõ là không biết, tuyệt đối không bịa.
    - Khi cần liệt kê, dùng (*) hoặc (-).
    - Nếu câu hỏi liên quan đến code, format code rõ ràng bằng Markdown.
    - Có thể sử dụng emoji vừa phải để câu trả lời sinh động hơn.
    - Luôn ưu tiên: hữu ích + chính xác + ngắn gọn + vui vẻ.

    Quan trọng: Đừng cố làm hài trong mọi câu trả lời. Hãy hài hước tự nhiên và đặt sự hữu ích lên trước.`;
  }

  /**
   * Tạo response từ Gemini với conversation history.
   *
   * Flow:
   * 1. Đọc history của room từ ConversationStore
   * 2. Nếu chưa có → tạo conversation mới
   * 3. Nạp history vào Gemini startChat()
   * 4. Gửi tin nhắn mới
   * 5. Lưu cặp (user, model) vào ConversationStore
   */
  public async generateResponse(roomId: string, message: string): Promise<string> {
    try {
      logger.info(`[GEMINI] Request started room_id=${roomId}`);

      const model = this.genAI.getGenerativeModel({
        model: config.gemini.model,
      });

      // ── Lấy hoặc khởi tạo conversation ───────────────────────
      const isNew = !conversationStore.exists(roomId);
      if (isNew) {
        conversationStore.createConversation(roomId);
      }

      const history = conversationStore.getHistory(roomId);

      // Debug context nếu bật
      if (config.conversation.debugGeminiContext) {
        logger.debug(
          `[GEMINI] Sending context for room_id=${roomId}, history_size=${history.length}`
        );
        // Không log nội dung thực để tránh lộ dữ liệu nhạy cảm
      }

      // ── Chuyển đổi sang định dạng Gemini SDK (Content[]) ─────
      // SDK v0.2.1 dùng InputContent (role + parts), không có systemInstruction
      const geminiHistory: Content[] = history.map((msg: ConversationMessage) => ({
        role: msg.role,
        parts: msg.parts,
      }));

      // ── Tạo chat session với history đã có ───────────────────
      const chat = model.startChat({
        history: geminiHistory,
      });

      // ── Prefix system prompt vào message đầu tiên của conversation ──
      // (SDK v0.2.1 không hỗ trợ systemInstruction nên dùng prefix)
      const promptToSend = isNew
        ? `${this.getSystemPrompt()}\n\n---\n${message}`
        : message;

      // ── Gửi tin nhắn mới ──────────────────────────────────────
      const result = await chat.sendMessage(promptToSend);
      const response = await result.response;
      const text = response.text();

      // ── Lưu cặp (user, model) vào store ──────────────────────
      // Lưu message gốc của user (không kèm system prompt) để context sạch hơn
      const newMessages: ConversationMessage[] = [
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text }] },
      ];
      conversationStore.saveHistory(roomId, newMessages);

      logger.info(`[GEMINI] Request completed room_id=${roomId}`);
      return text;
    } catch (error: any) {
      logger.error(`[GEMINI] Request failed room_id=${roomId}`, error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
