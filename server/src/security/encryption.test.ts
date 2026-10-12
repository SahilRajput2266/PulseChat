import { describe, it, expect } from 'vitest';
import { encryptString, decryptString, encryptBuffer, decryptPayload } from './encryption';

describe('AES-256-GCM Session Storage Encryption', () => {
  it('should encrypt and decrypt string data correctly', () => {
    const sensitiveData = JSON.stringify({ creds: 'super-secret-session-auth-token', privateKey: '123abcxyz' });
    const encrypted = encryptString(sensitiveData);

    expect(encrypted).not.toContain('super-secret');
    expect(encrypted.split(':').length).toBe(3); // iv:tag:data

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });

  it('should encrypt and decrypt buffers with authenticated tag verification', () => {
    const rawBuffer = Buffer.from('Binary WhatsApp Signal Key Content');
    const encrypted = encryptBuffer(rawBuffer);

    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.data).toBeDefined();

    const decrypted = decryptPayload(encrypted);
    expect(decrypted.toString()).toBe('Binary WhatsApp Signal Key Content');
  });

  it('should throw an error if authenticated tag or ciphertext is tampered with', () => {
    const payload = encryptBuffer('integrity test');
    // Tamper with ciphertext
    const tamperedHex = payload.data.slice(0, -2) + (payload.data.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tamperedPayload = { ...payload, data: tamperedHex };

    expect(() => decryptPayload(tamperedPayload)).toThrow();
  });
});
