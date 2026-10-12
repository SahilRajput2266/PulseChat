import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from the configured encryption key string
 */
function getDerivedKey(keyString: string): Buffer {
  if (keyString.length === 64 && /^[0-9a-fA-F]+$/.test(keyString)) {
    return Buffer.from(keyString, 'hex');
  }
  return crypto.createHash('sha256').update(keyString).digest();
}

const activeKey = getDerivedKey(env.SESSION_ENCRYPTION_KEY);

export interface EncryptedPayload {
  iv: string; // hex
  tag: string; // hex
  data: string; // hex
}

/**
 * Encrypt buffer or string using AES-256-GCM
 */
export function encryptBuffer(data: Buffer | string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, activeKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  const bufferToEncrypt = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  const encrypted = Buffer.concat([cipher.update(bufferToEncrypt), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex')
  };
}

/**
 * Decrypt payload using AES-256-GCM
 */
export function decryptPayload(payload: EncryptedPayload): Buffer {
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const encryptedData = Buffer.from(payload.data, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, activeKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
}

/**
 * Helper to encrypt string data to compact string
 */
export function encryptString(text: string): string {
  const payload = encryptBuffer(text);
  return `${payload.iv}:${payload.tag}:${payload.data}`;
}

/**
 * Helper to decrypt compact string
 */
export function decryptString(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload');
  }
  const [iv, tag, data] = parts;
  const decryptedBuf = decryptPayload({ iv, tag, data });
  return decryptedBuf.toString('utf-8');
}
