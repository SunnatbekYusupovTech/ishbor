import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { RefreshToken } from '@/models/RefreshToken';
import { generateRefreshToken, hashRefreshToken } from '@/utils/jwt';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/utils/cookies';

describe('POST /api/auth/refresh + /api/auth/logout', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();
  let userId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const user = await User.create({
      name: 'Refresh Tester',
      email: 'refresh-tester@example.com',
      passwordHash: 'irrelevant-for-this-test',
      role: 'seeker',
    });
    userId = user._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  /** Issues a refresh token row directly (bypasses the rate-limited HTTP endpoints). */
  async function issueRawRefreshToken(overrides: { expiresAt?: Date } = {}) {
    const raw = generateRefreshToken();
    await RefreshToken.create({
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
    });
    return raw;
  }

  /** Both auth tokens travel as httpOnly cookies now, never in the body. */
  function refreshCookie(raw: string) {
    return `${REFRESH_COOKIE}=${raw}`;
  }

  it('exchanges a valid refresh token for a new access + refresh token pair', async () => {
    const raw = await issueRawRefreshToken();

    const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie(raw));
    expect(res.status).toBe(200);
    expect(res.body.data.refreshed).toBe(true);

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const accessCookie = setCookie.find((c) => c.startsWith(`${ACCESS_COOKIE}=`));
    const newRefreshCookie = setCookie.find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
    expect(accessCookie).toBeDefined();
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).not.toContain(`${REFRESH_COOKIE}=${raw};`);
  });

  it('rotation revokes the old refresh token — it cannot be reused', async () => {
    const raw = await issueRawRefreshToken();

    const first = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie(raw));
    expect(first.status).toBe(200);

    const replay = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie(raw));
    expect(replay.status).toBe(401);
    expect(replay.body.success).toBe(false);
  });

  it('rejects an unknown refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie(generateRefreshToken()));
    expect(res.status).toBe(401);
  });

  it('rejects an expired refresh token', async () => {
    const raw = await issueRawRefreshToken({ expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie(raw));
    expect(res.status).toBe(401);
  });

  it('rejects a request with no refresh cookie at all', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('logout revokes the refresh token so it can no longer be used', async () => {
    const raw = await issueRawRefreshToken();

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', refreshCookie(raw));
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.loggedOut).toBe(true);

    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie(raw));
    expect(afterLogout.status).toBe(401);
  });

  it('logout with no refresh cookie is a harmless no-op', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);
  });
});
