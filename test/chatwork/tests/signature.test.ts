import { verifySignature } from '../src/webhooks/chatwork.signature';
import crypto from 'crypto';

describe('Signature Verification', () => {
  it('should return true for valid signature', () => {
    const token = Buffer.from('secret_token').toString('base64');
    const rawBody = Buffer.from(JSON.stringify({ test: 'data' }));
    
    // Generate valid signature
    const signature = crypto.createHmac('sha256', Buffer.from(token, 'base64')).update(rawBody).digest('base64');
    
    const isValid = verifySignature(rawBody, signature, token);
    expect(isValid).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const token = Buffer.from('secret_token').toString('base64');
    const rawBody = Buffer.from(JSON.stringify({ test: 'data' }));
    const signature = 'invalid_signature_base64_string';
    
    const isValid = verifySignature(rawBody, signature, token);
    expect(isValid).toBe(false);
  });

  it('should return false for missing parameters', () => {
    expect(verifySignature(Buffer.from(''), '', '')).toBe(false);
    expect(verifySignature(Buffer.from('body'), 'sig', '')).toBe(false);
    // @ts-ignore
    expect(verifySignature(null, 'sig', 'token')).toBe(false);
  });
});
