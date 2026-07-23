import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/**
 * bcrypt (via bcryptjs) is the hashing algorithm for all NEW password hashes.
 * `verifyPassword` still understands the older `salt:derived` scrypt format
 * (see `verifyScrypt` below) so accounts created before this change keep
 * working — their hash is upgraded to bcrypt transparently on next successful
 * login by the caller (see `authController.login`).
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]?\$/.test(stored);
}

function verifyScrypt(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, 'hex');
  return hashBuf.length === derived.length && crypto.timingSafeEqual(hashBuf, derived);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (isBcryptHash(stored)) return bcrypt.compareSync(password, stored);
  return verifyScrypt(password, stored);
}
