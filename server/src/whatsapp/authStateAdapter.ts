import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataTypeMap
} from '@whiskeysockets/baileys';
import { encryptString, decryptString } from '../security/encryption';
import { logger } from '../utils/logger';

const SESSIONS_DIR = path.resolve(process.cwd(), 'auth_sessions');

export function getUserSessionDir(userId: string): string {
  return path.join(SESSIONS_DIR, `user_${userId}`);
}

/**
 * Creates an encrypted isolated authentication state adapter for Baileys
 * All sensitive credential files are encrypted with AES-256-GCM at rest.
 */
export async function useEncryptedAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearSession: () => Promise<void>;
}> {
  const userDir = getUserSessionDir(userId);

  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }

  const credsFilePath = path.join(userDir, 'creds.json');

  async function writeEncryptedFile(fileName: string, data: unknown): Promise<void> {
    const rawJson = JSON.stringify(data, BufferJSON.replacer);
    const encrypted = encryptString(rawJson);
    const targetPath = path.join(userDir, fileName);
    await fs.writeFile(targetPath, encrypted, 'utf-8');
  }

  async function readDecryptedFile<T = unknown>(fileName: string): Promise<T | null> {
    const targetPath = path.join(userDir, fileName);
    try {
      if (!existsSync(targetPath)) return null;
      const encrypted = await fs.readFile(targetPath, 'utf-8');
      const decrypted = decryptString(encrypted);
      return JSON.parse(decrypted, BufferJSON.reviver) as T;
    } catch (err) {
      logger.error({ userId, fileName, err }, 'Failed to read or decrypt session file');
      return null;
    }
  }

  async function removeFile(fileName: string): Promise<void> {
    const targetPath = path.join(userDir, fileName);
    try {
      if (existsSync(targetPath)) {
        await fs.unlink(targetPath);
      }
    } catch {
      // Ignore cleanup error
    }
  }

  // Load or initialize credentials
  const existingCreds = await readDecryptedFile<AuthenticationCreds>('creds.json');
  const creds: AuthenticationCreds = existingCreds || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [key: string]: SignalDataTypeMap[T] }> => {
          const data: { [key: string]: SignalDataTypeMap[T] } = {};
          await Promise.all(
            ids.map(async id => {
              const fileName = `${type}-${id}.json`;
              const value = await readDecryptedFile<SignalDataTypeMap[T]>(fileName);
              if (value) {
                if (type === 'app-state-sync-key' && value) {
                  data[id] = proto.Message.AppStateSyncKeyData.fromObject(value) as any;
                } else {
                  data[id] = value;
                }
              }
            })
          );
          return data;
        },
        set: async (data: any): Promise<void> => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const fileName = `${category}-${id}.json`;
              if (value) {
                tasks.push(writeEncryptedFile(fileName, value));
              } else {
                tasks.push(removeFile(fileName));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeEncryptedFile('creds.json', creds);
    },
    clearSession: async () => {
      try {
        if (existsSync(userDir)) {
          await fs.rm(userDir, { recursive: true, force: true });
        }
        logger.info({ userId }, 'Session directory purged securely');
      } catch (err) {
        logger.error({ userId, err }, 'Error clearing session directory');
      }
    }
  };
}
