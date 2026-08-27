import { handleChatMessage } from '../src/handlers/chatwork-message.handler';
import { chatworkService } from '../src/services/chatwork.service';
import { geminiService } from '../src/services/gemini.service';
import { conversationStore } from '../src/services/conversation.store';
import { config } from '../src/config/env';

jest.mock('../src/services/chatwork.service');
jest.mock('../src/services/gemini.service');
jest.mock('../src/services/conversation.store');

describe('Chatwork Message Handler', () => {
  beforeEach(() => {
    config.chatwork.botAccountId = 'bot123';
    jest.clearAllMocks();

    // Mock conversationStore
    (conversationStore.exists as jest.Mock).mockReturnValue(true);
    (conversationStore.getHistory as jest.Mock).mockReturnValue([]);
    (conversationStore.resetHistory as jest.Mock).mockImplementation(() => {});
    (conversationStore.createConversation as jest.Mock).mockImplementation(() => {});
    (conversationStore.saveHistory as jest.Mock).mockImplementation(() => {});
  });

  // ── Test 1: Duplicate protection ────────────────────────────
  it('should ignore duplicate events', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 1, message_id: 10, account_id: 123, body: 'test dup' }
    };

    await handleChatMessage(event);
    await handleChatMessage(event); // duplicate

    // isBotMentioned chỉ được gọi 1 lần vì duplicate protection
    expect(chatworkService.isBotMentioned).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: Non-message_created event ───────────────────────
  it('should ignore non message_created events', async () => {
    const event = {
      webhook_event_type: 'message_updated',
      webhook_event: { room_id: 2, message_id: 20, account_id: 123, body: 'test' }
    };
    await handleChatMessage(event);
    expect(chatworkService.isBotMentioned).not.toHaveBeenCalled();
  });

  // ── Test 3: Bot loop protection ─────────────────────────────
  it('should ignore own messages (bot loop protection)', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 3, message_id: 30, account_id: 'bot123', body: 'bot talking' }
    };
    await handleChatMessage(event);
    expect(chatworkService.isBotMentioned).not.toHaveBeenCalled();
  });

  // ── Test 4: Xử lý tin nhắn hợp lệ ──────────────────────────
  it('should process mention and call geminiService with roomId', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 4, message_id: 40, account_id: 456, body: '[To:bot123] hello' }
    };

    (chatworkService.isBotMentioned as jest.Mock).mockReturnValue(true);
    (chatworkService.cleanMessageBody as jest.Mock).mockReturnValue('hello');
    (geminiService.generateResponse as jest.Mock).mockResolvedValue('Hi there');

    await handleChatMessage(event);

    // Phải truyền roomId vào generateResponse
    expect(geminiService.generateResponse).toHaveBeenCalledWith('4', 'hello');
    expect(chatworkService.sendMessage).toHaveBeenCalledWith('4', '[rp aid=456 to=4-40]\nHi there');
  });

  // ── Test 5: Conversation reuse vs create ────────────────────
  it('should reuse existing conversation when roomId already has history', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 5, message_id: 50, account_id: 789, body: '[To:bot123] Docker Compose thì sao?' }
    };

    (chatworkService.isBotMentioned as jest.Mock).mockReturnValue(true);
    (chatworkService.cleanMessageBody as jest.Mock).mockReturnValue('Docker Compose thì sao?');
    (geminiService.generateResponse as jest.Mock).mockResolvedValue('Docker Compose là...');
    (conversationStore.exists as jest.Mock).mockReturnValue(true);

    await handleChatMessage(event);

    expect(geminiService.generateResponse).toHaveBeenCalledWith('5', 'Docker Compose thì sao?');
  });

  // ── Test 6: /reset command ──────────────────────────────────
  it('should clear conversation and send reset confirmation on /reset', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 6, message_id: 60, account_id: 111, body: '[To:bot123] /reset' }
    };

    (chatworkService.isBotMentioned as jest.Mock).mockReturnValue(true);
    (chatworkService.cleanMessageBody as jest.Mock).mockReturnValue('/reset');

    await handleChatMessage(event);

    // /reset phải gọi resetHistory
    expect(conversationStore.resetHistory).toHaveBeenCalledWith('6');
    // Phải gửi xác nhận về Chatwork
    expect(chatworkService.sendMessage).toHaveBeenCalledWith(
      '6',
      expect.stringContaining('Đã xoá lịch sử hội thoại')
    );
    // Không được gọi Gemini
    expect(geminiService.generateResponse).not.toHaveBeenCalled();
  });

  // ── Test 7: Room isolation (handler level) ──────────────────
  it('should use correct roomId for each room (isolation)', async () => {
    const eventRoomA = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 100, message_id: 100, account_id: 1, body: '[To:bot123] Docker' }
    };
    const eventRoomB = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 200, message_id: 200, account_id: 2, body: '[To:bot123] Kubernetes' }
    };

    (chatworkService.isBotMentioned as jest.Mock).mockReturnValue(true);
    (chatworkService.cleanMessageBody as jest.Mock)
      .mockReturnValueOnce('Docker')
      .mockReturnValueOnce('Kubernetes');
    (geminiService.generateResponse as jest.Mock)
      .mockResolvedValueOnce('Docker response')
      .mockResolvedValueOnce('Kubernetes response');

    await handleChatMessage(eventRoomA);
    await handleChatMessage(eventRoomB);

    const calls = (geminiService.generateResponse as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('100'); // Room A → roomId '100'
    expect(calls[1][0]).toBe('200'); // Room B → roomId '200'
  });

  // ── Test 8: Empty message after cleaning ────────────────────
  it('should ignore empty messages after cleaning', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 7, message_id: 70, account_id: 222, body: '[To:bot123]' }
    };

    (chatworkService.isBotMentioned as jest.Mock).mockReturnValue(true);
    (chatworkService.cleanMessageBody as jest.Mock).mockReturnValue('');

    await handleChatMessage(event);

    expect(geminiService.generateResponse).not.toHaveBeenCalled();
    expect(chatworkService.sendMessage).not.toHaveBeenCalled();
  });
});
