import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// ────────────────────────────────────────────────────────────────
// Types – tuân thủ định dạng của @google/generative-ai SDK
// ────────────────────────────────────────────────────────────────

export interface ConversationPart {
  text: string;
}

export interface ConversationMessage {
  role: 'user' | 'model';
  parts: ConversationPart[];
}

export interface ConversationRecord {
  /** Khóa định danh (conversation_key = room_id) */
  key: string;
  roomId: string;
  history: ConversationMessage[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Cấu trúc lưu trong file JSON */
type StorageData = Record<string, ConversationRecord>;

// ────────────────────────────────────────────────────────────────
// ConversationStore
// ────────────────────────────────────────────────────────────────

export class ConversationStore {
  private readonly storagePath: string;
  /** Cache in-memory để tránh đọc file liên tục */
  private cache: StorageData = {};
  private loaded = false;

  constructor(storagePath?: string) {
    this.storagePath = path.resolve(
      process.cwd(),
      storagePath ?? config.conversation.storageFile
    );
    this.ensureDataDir();
    this.load();
  }

  // ── private helpers ──────────────────────────────────────────

  private ensureDataDir(): void {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`[CONVERSATION] Created storage directory: ${dir}`);
    }
    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(this.storagePath, JSON.stringify({}, null, 2), 'utf-8');
      logger.info(`[CONVERSATION] Created storage file: ${this.storagePath}`);
    }
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.storagePath, 'utf-8');
      this.cache = JSON.parse(raw) as StorageData;
      this.loaded = true;
      logger.info(`[CONVERSATION] Loaded ${Object.keys(this.cache).length} conversation(s) from storage`);
    } catch (err) {
      logger.error('[CONVERSATION] Failed to load storage file, starting fresh', err);
      this.cache = {};
      this.loaded = true;
    }
  }

  private persist(): void {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[CONVERSATION] Failed to persist conversation to file', err);
    }
  }

  private buildKey(roomId: string): string {
    // conversation_key = room_id (MVP)
    // Dễ dàng mở rộng thành `${roomId}:${accountId}` trong tương lai
    return `room_${roomId}`;
  }

  private isExpired(record: ConversationRecord): boolean {
    const ttl = config.conversation.ttlMinutes;
    if (!ttl || ttl <= 0) return false;

    const lastActivity = new Date(record.updatedAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - lastActivity) / 1000 / 60;
    return diffMinutes > ttl;
  }

  // ── public API ───────────────────────────────────────────────

  /**
   * Lấy lịch sử hội thoại của một room.
   * Trả về mảng messages (đã áp dụng giới hạn MAX_CONVERSATION_MESSAGES).
   */
  public getHistory(roomId: string): ConversationMessage[] {
    const key = this.buildKey(roomId);
    const record = this.cache[key];

    if (!record) {
      logger.info(`[CONVERSATION] room_id=${roomId} action=not_found`);
      return [];
    }

    if (this.isExpired(record)) {
      logger.info(`[CONVERSATION] room_id=${roomId} action=expired — clearing conversation`);
      this.resetHistory(roomId);
      return [];
    }

    const limit = config.conversation.maxMessages;
    // Lấy `limit` messages gần nhất (đảm bảo luôn theo cặp user/model)
    const history = record.history.slice(-limit);
    logger.info(`[CONVERSATION] room_id=${roomId} action=reused history_size=${history.length}`);
    return history;
  }

  /**
   * Kiểm tra xem conversation có tồn tại không (dùng để log created/reused).
   */
  public exists(roomId: string): boolean {
    const key = this.buildKey(roomId);
    const record = this.cache[key];
    return !!record && !this.isExpired(record);
  }

  /**
   * Lưu lịch sử hội thoại (append message mới vào cuối).
   */
  public saveHistory(roomId: string, newMessages: ConversationMessage[]): void {
    const key = this.buildKey(roomId);
    const now = new Date().toISOString();

    if (!this.cache[key]) {
      this.cache[key] = {
        key,
        roomId,
        history: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    const record = this.cache[key];
    record.history.push(...newMessages);
    record.updatedAt = now;

    // Trim để không vượt giới hạn lưu trữ (lưu nhiều hơn limit để không mất context)
    const storeLimit = config.conversation.maxMessages * 2; // giữ tối đa 2x để safety
    if (record.history.length > storeLimit) {
      record.history = record.history.slice(-storeLimit);
    }

    this.persist();
  }

  /**
   * Xoá lịch sử hội thoại của một room.
   */
  public resetHistory(roomId: string): void {
    const key = this.buildKey(roomId);
    const existed = !!this.cache[key];
    delete this.cache[key];
    this.persist();

    if (existed) {
      logger.info(`[CONVERSATION] room_id=${roomId} action=reset`);
    } else {
      logger.info(`[CONVERSATION] room_id=${roomId} action=reset (no existing conversation)`);
    }
  }

  /**
   * Tạo conversation mới (dùng khi lần đầu tiên).
   * Ghi log action=created.
   */
  public createConversation(roomId: string): void {
    const key = this.buildKey(roomId);
    const now = new Date().toISOString();
    this.cache[key] = {
      key,
      roomId,
      history: [],
      createdAt: now,
      updatedAt: now,
    };
    this.persist();
    logger.info(`[CONVERSATION] room_id=${roomId} action=created`);
  }

  /** Xem số lượng conversations đang lưu (debug) */
  public size(): number {
    return Object.keys(this.cache).length;
  }
}

// Singleton instance – dùng chung toàn ứng dụng
export const conversationStore = new ConversationStore();
