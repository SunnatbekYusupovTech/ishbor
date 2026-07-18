import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User } from '@/models/User';
import { signAuthToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Lightweight auth to make the assessment flow runnable end-to-end.
 * NOTE: This uses scrypt password hashing as a self-contained default.
 * In production, wire this to your real identity provider / SSO.
 */

const credentialsSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['employer', 'seeker']).optional(),
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, 'hex');
  return hashBuf.length === derived.length && crypto.timingSafeEqual(hashBuf, derived);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = credentialsSchema.parse(req.body);

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('Email already registered.');

  const user = await User.create({
    name: name ?? email.split('@')[0],
    email,
    passwordHash: hashPassword(password),
    role: role ?? 'seeker',
  });

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = credentialsSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        verificationLevel: user.verificationLevel,
      },
    },
  });
});
