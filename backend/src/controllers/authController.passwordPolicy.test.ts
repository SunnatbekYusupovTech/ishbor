import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';

describe('password policy', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it.each([
    ['password', 'no uppercase/digit/symbol'],
    ['PASSWORD1!', 'no lowercase'],
    ['password1!', 'no uppercase'],
    ['Password!!', 'no digit'],
    ['Password1', 'no symbol'],
    ['Pw1!', 'too short'],
  ])('rejects registration with a weak password (%s — %s)', async (password) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `weak-${Date.now()}-${Math.random()}@example.com`, password });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('accepts registration with a password meeting every requirement', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'strong-password@example.com', password: 'Str0ng!Pass' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
  });

  it('does NOT enforce the policy on login — a legacy weak password still works', async () => {
    // Simulates an account created before this policy existed (or seeded
    // directly, like backend/src/scripts/seed.ts does with "password123").
    const crypto = await import('node:crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync('password123', salt, 64).toString('hex');
    await User.create({
      name: 'Legacy User',
      email: 'legacy-weak-password@example.com',
      passwordHash: `${salt}:${derived}`,
      role: 'seeker',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'legacy-weak-password@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });
});
