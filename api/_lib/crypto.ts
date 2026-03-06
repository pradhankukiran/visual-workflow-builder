import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Cached parsed encryption key (module-level singleton). */
let _cachedKey: Uint8Array | null = null;

function getKey(): Uint8Array {
  if (_cachedKey) return _cachedKey;
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is not set');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  _cachedKey = new Uint8Array(key);
  return _cachedKey;
}

export function encrypt(plaintext: string): string {
  const iv = new Uint8Array(randomBytes(IV_LENGTH));
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const updated = new Uint8Array(cipher.update(plaintext, 'utf8'));
  const final = new Uint8Array(cipher.final());
  const tag = new Uint8Array(cipher.getAuthTag());
  const encrypted = new Uint8Array(updated.length + final.length);
  encrypted.set(updated);
  encrypted.set(final, updated.length);
  const result = new Uint8Array(iv.length + tag.length + encrypted.length);
  result.set(iv);
  result.set(tag, iv.length);
  result.set(encrypted, iv.length + tag.length);
  return Buffer.from(result).toString('base64');
}

export function decrypt(encoded: string): string {
  const buf = new Uint8Array(Buffer.from(encoded, 'base64'));
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
