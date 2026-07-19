import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { RefreshToken } from '@/models/RefreshToken';
import { signAuthToken, generateRefreshToken, hashRefreshToken } from '@/utils/jwt';

describe('POST /api/auth/logout-all', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const user = await User.create({
      name: 'Multi Device User',
      email: 'multi-device@example.com',
      passwordHash: 'irrelevant-for-this-test',
      role: 'seeker',
    });
    userId = user._id.toString();
    accessToken = signAuthToken({ userId, email: user.email });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  async function issueRawRefreshToken() {
    const raw = generateRefreshToken();
    await RefreshToken.create({
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
    });
    return raw;
  }

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/auth/logout-all');
    expect(res.status).toBe(401);
  });

  it('revokes every refresh token the user holds — simulating three devices', async () => {
    const deviceA = await issueRawRefreshToken();
    const deviceB = await issueRawRefreshToken();
    const deviceC = await issueRawRefreshToken();

    const res = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.revokedCount).toBe(3);

    for (const raw of [deviceA, deviceB, deviceC]) {
      const refreshAttempt = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: raw });
      expect(refreshAttempt.status).toBe(401);
    }
  });

  it('does not touch another user\'s refresh tokens', async () => {
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other-user@example.com',
      passwordHash: 'irrelevant',
      role: 'seeker',
    });
    const otherRaw = generateRefreshToken();
    await RefreshToken.create({
      userId: otherUser._id,
      tokenHash: hashRefreshToken(otherRaw),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const res = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    // Only this user's tokens are affected — the other user's is untouched.
    expect(res.body.data.revokedCount).toBe(0);

    const stillValid = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: otherRaw });
    expect(stillValid.status).toBe(200);
  });

  it('is idempotent — calling it again with nothing left to revoke is a harmless no-op', async () => {
    const res = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.revokedCount).toBe(0);
  });
});
