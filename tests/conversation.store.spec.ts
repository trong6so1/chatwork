import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Override config trước khi import ConversationStore
process.env.MAX_CONVERSATION_MESSAGES = '6';
process.env.CONVERSATION_TTL_MINUTES = '0';

import { ConversationStore, ConversationMessage } from '../src/services/conversation.store';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const makeUserMsg = (text: string): ConversationMessage => ({
  role: 'user',
  parts: [{ text }],
});

const makeModelMsg = (text: string): ConversationMessage => ({
  role: 'model',
  parts: [{ text }],
});

const makeStore = (tempDir: string): ConversationStore => {
  const storagePath = path.join(tempDir, 'conversations.json');
  return new ConversationStore(storagePath);
};

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-test-'));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ────────────────────────────────────────────────────────────────
// Test 1: Conversation mới
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – Conversation mới', () => {
  it('should return empty history for a new room', () => {
    const store = makeStore(tempDir);
    const history = store.getHistory('room_new');
    expect(history).toEqual([]);
  });

  it('should not exist before createConversation is called', () => {
    const store = makeStore(tempDir);
    expect(store.exists('room_100')).toBe(false);
  });

  it('should exist after createConversation is called', () => {
    const store = makeStore(tempDir);
    store.createConversation('room_100');
    expect(store.exists('room_100')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────
// Test 2: Reuse conversation
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – Reuse conversation', () => {
  it('should persist and return saved history', () => {
    const store = makeStore(tempDir);
    store.createConversation('room_200');
    store.saveHistory('room_200', [
      makeUserMsg('Docker là gì?'),
      makeModelMsg('Docker là nền tảng container...'),
    ]);

    const history = store.getHistory('room_200');
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[0].parts[0].text).toBe('Docker là gì?');
    expect(history[1].role).toBe('model');
  });

  it('should accumulate messages across multiple saves', () => {
    const store = makeStore(tempDir);
    store.createConversation('room_201');

    store.saveHistory('room_201', [
      makeUserMsg('Msg 1'),
      makeModelMsg('Reply 1'),
    ]);
    store.saveHistory('room_201', [
      makeUserMsg('Msg 2'),
      makeModelMsg('Reply 2'),
    ]);

    const history = store.getHistory('room_201');
    expect(history).toHaveLength(4);
  });
});

// ────────────────────────────────────────────────────────────────
// Test 3: Context – history đúng thứ tự
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – Context preservation', () => {
  it('should return history in correct order for Gemini', () => {
    const store = makeStore(tempDir);
    store.createConversation('room_300');
    store.saveHistory('room_300', [
      makeUserMsg('Docker là gì?'),
      makeModelMsg('Docker là...'),
    ]);
    store.saveHistory('room_300', [
      makeUserMsg('Nó hoạt động như thế nào?'),
      makeModelMsg('Docker dùng container...'),
    ]);

    const history = store.getHistory('room_300');
    expect(history[0].parts[0].text).toBe('Docker là gì?');
    expect(history[1].parts[0].text).toBe('Docker là...');
    expect(history[2].parts[0].text).toBe('Nó hoạt động như thế nào?');
    expect(history[3].parts[0].text).toBe('Docker dùng container...');
  });
});

// ────────────────────────────────────────────────────────────────
// Test 4: Room isolation
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – Room isolation', () => {
  it('should keep Room A and Room B history separate', () => {
    const store = makeStore(tempDir);

    store.createConversation('room_A');
    store.saveHistory('room_A', [
      makeUserMsg('Tôi đang học Docker.'),
      makeModelMsg('Docker là công cụ container hóa.'),
    ]);

    store.createConversation('room_B');
    store.saveHistory('room_B', [
      makeUserMsg('Tôi đang học Kubernetes.'),
      makeModelMsg('Kubernetes là hệ thống orchestration.'),
    ]);

    const historyA = store.getHistory('room_A');
    const historyB = store.getHistory('room_B');

    expect(historyA).toHaveLength(2);
    expect(historyB).toHaveLength(2);
    expect(historyA[0].parts[0].text).toContain('Docker');
    expect(historyB[0].parts[0].text).toContain('Kubernetes');

    // Đảm bảo không bị trộn
    expect(historyA[0].parts[0].text).not.toContain('Kubernetes');
    expect(historyB[0].parts[0].text).not.toContain('Docker');
  });
});

// ────────────────────────────────────────────────────────────────
// Test 5: Reset
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – Reset', () => {
  it('should clear history after reset', () => {
    const store = makeStore(tempDir);
    store.createConversation('room_500');
    store.saveHistory('room_500', [
      makeUserMsg('Docker là gì?'),
      makeModelMsg('Docker là...'),
    ]);

    expect(store.getHistory('room_500')).toHaveLength(2);

    store.resetHistory('room_500');

    expect(store.exists('room_500')).toBe(false);
    expect(store.getHistory('room_500')).toHaveLength(0);
  });

  it('should not throw when resetting a non-existent conversation', () => {
    const store = makeStore(tempDir);
    expect(() => store.resetHistory('room_nonexistent')).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────
// Test 6: Persistence (save & load từ file – giả lập restart)
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – Persistence', () => {
  it('should persist data to disk and reload it after restart', () => {
    const storagePath = path.join(tempDir, 'conversations.json');

    // Store 1 – ghi dữ liệu
    const store1 = new ConversationStore(storagePath);
    store1.createConversation('room_persist');
    store1.saveHistory('room_persist', [
      makeUserMsg('Test persistence'),
      makeModelMsg('Đã lưu rồi nhé'),
    ]);

    // Store 2 – tạo mới từ cùng file → giả lập restart server
    const store2 = new ConversationStore(storagePath);
    const history = store2.getHistory('room_persist');

    expect(history).toHaveLength(2);
    expect(history[0].parts[0].text).toBe('Test persistence');
    expect(history[1].parts[0].text).toBe('Đã lưu rồi nhé');
  });
});

// ────────────────────────────────────────────────────────────────
// Test 7: Giới hạn maxMessages
// ────────────────────────────────────────────────────────────────
describe('ConversationStore – History limit', () => {
  it('should return at most maxMessages entries from getHistory', () => {
    const store = makeStore(tempDir);
    store.createConversation('room_limit');

    // Thêm 10 messages (5 cặp user/model)
    for (let i = 0; i < 5; i++) {
      store.saveHistory('room_limit', [
        makeUserMsg(`Question ${i}`),
        makeModelMsg(`Answer ${i}`),
      ]);
    }

    const history = store.getHistory('room_limit');
    // MAX_CONVERSATION_MESSAGES=6, nên phải bị cắt về 6
    expect(history.length).toBeLessThanOrEqual(6);
  });
});
