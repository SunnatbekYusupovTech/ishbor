import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';

describe('authRateLimiter', () => {
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

  it('locks out /auth/login after too many attempts from the same source', async () => {
    const payload = { email: 'nouser@example.com', password: 'wrongpassword' };

    let lastStatus = 0;
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/auth/login').send(payload);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(401); // 10 attempts allowed, all fail auth (no such user)

    const blocked = await request(app).post('/api/auth/login').send(payload);
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error.message).toMatch(/too many/i);
  });
});
