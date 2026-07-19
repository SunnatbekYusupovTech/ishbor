import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';

/**
 * `admin` must never be self-assignable through public registration — it can
 * only be granted by editing the database directly. This guards against a
 * regression where someone "helpfully" widens `registerSchema`'s role enum.
 */
describe('admin role is not self-assignable via registration', () => {
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

  it('rejects registration with role "admin"', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'wannabe-admin@example.com',
      password: 'Str0ng!Pass',
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
