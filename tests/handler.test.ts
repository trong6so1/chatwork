import { handleChatMessage } from '../src/handlers/chatwork-message.handler';
import { chatworkService } from '../src/services/chatwork.service';
import { geminiService } from '../src/services/gemini.service';
import { config } from '../src/config/env';

jest.mock('../src/services/chatwork.service');
jest.mock('../src/services/gemini.service');

describe('Chatwork Message Handler', () => {
  beforeEach(() => {
    config.chatwork.botAccountId = 'bot123';
    jest.clearAllMocks();
  });

  it('should ignore duplicate events', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 1, message_id: 1, account_id: 123, body: 'test' }
    };
    
    // Call first time
    await handleChatMessage(event);
    
    // Call second time
    await handleChatMessage(event);
    
    // chatworkService.isBotMentioned should only be called once because of duplicate protection
    expect(chatworkService.isBotMentioned).toHaveBeenCalledTimes(1);
  });

  it('should ignore non message_created events', async () => {
    const event = {
      webhook_event_type: 'message_updated',
      webhook_event: { room_id: 2, message_id: 2, account_id: 123, body: 'test' }
    };
    await handleChatMessage(event);
    expect(chatworkService.isBotMentioned).not.toHaveBeenCalled();
  });

  it('should ignore own messages (bot loop protection)', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 3, message_id: 3, account_id: 'bot123', body: 'test' }
    };
    await handleChatMessage(event);
    expect(chatworkService.isBotMentioned).not.toHaveBeenCalled();
  });

  it('should process if mentioned and send response', async () => {
    const event = {
      webhook_event_type: 'message_created',
      webhook_event: { room_id: 4, message_id: 4, account_id: 456, body: '[To:bot123] hello' }
    };

    (chatworkService.isBotMentioned as jest.Mock).mockReturnValue(true);
    (chatworkService.cleanMessageBody as jest.Mock).mockReturnValue('hello');
    (geminiService.generateResponse as jest.Mock).mockResolvedValue('Hi there');

    await handleChatMessage(event);

    expect(geminiService.generateResponse).toHaveBeenCalledWith('hello');
    expect(chatworkService.sendMessage).toHaveBeenCalledWith('4', '[rp aid=456 to=4-4]\nHi there');
  });
});
