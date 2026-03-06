import { redis, credentialKey } from './redis.js';
import { decrypt } from './crypto.js';
import { isValidId } from './validation.js';

export async function resolveCredential(userId: string, credentialId: string): Promise<string> {
  if (!isValidId(credentialId)) {
    throw new Error('Invalid credential ID format');
  }
  const raw = await redis.get<string>(credentialKey(userId, credentialId));
  if (!raw) throw new Error('Credential not found');
  const cred = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return decrypt(cred.encryptedValue);
}
