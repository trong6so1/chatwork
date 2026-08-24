import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Verify Chatwork Webhook Signature
 * Signature is generated using HMAC-SHA256 from the raw request body and the webhook token, then encoded as Base64.
 * 
 * @param rawBody The raw buffer of the HTTP request body
 * @param signature The signature from the `X-ChatworkWebhookSignature` header
 * @param token The Chatwork Webhook Token
 * @returns boolean
 */
export function verifySignature(rawBody: Buffer, signature: string, token: string): boolean {
  if (!signature || !token || !rawBody) {
    return false;
  }
  try {
    const expectedSignature = crypto
      .createHmac('sha256', Buffer.from(token, 'base64')) // Lưu ý: Chatwork Webhook token là base64, theo docs thì dùng trực tiếp chuỗi token hay base64 decoded?
      // Thực tế, Chatwork Webhook Token được cấp ở dạng chuỗi Base64. Documentation yêu cầu dùng token được cấp như secret key (đôi khi cần decode tuỳ ngôn ngữ, nhưng trong Node.js crypto.createHmac nhận string hoặc Buffer. Thường dùng token decode từ base64 làm secret).
      // Let's decode the base64 token to binary buffer for HMAC secret. 
      .update(rawBody)
      .digest('base64');

    return expectedSignature === signature;
  } catch (error) {
    logger.error('Error verifying signature', error);
    return false;
  }
}
