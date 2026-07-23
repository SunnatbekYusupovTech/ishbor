import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { Session } from '@/models/Session';
import { signAuthToken } from '@/utils/jwt';

describe('GET /api/admin/violations', () => {
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

  async function createUser(role: 'seeker' | 'employer' | 'admin') {
    const user = await User.create({
      name: `${role} user`,
      email: `${role}-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: 'irrelevant',
      role,
    });
    const token = signAuthToken({ userId: user._id.toString(), email: user.email });
    return { user, token };
  }

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/admin/violations');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin (seeker) request', async () => {
    const { token } = await createUser('seeker');
    const res = await request(app)
      .get('/api/admin/violations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a non-admin (employer) request', async () => {
    const { token } = await createUser('employer');
    const res = await request(app)
      .get('/api/admin/violations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('an admin sees flagged sessions, in the proposed shape, excluding clean ones', async () => {
    const { token: adminToken } = await createUser('admin');
    const { user: candidate } = await createUser('seeker');

    const flaggedSession = await Session.create({
      userId: candidate._id,
      direction: 'frontend',
      questionIds: [],
      optionOrders: [],
      status: 'terminated',
      startTime: new Date(),
      deadline: new Date(Date.now() + 60_000),
      endTime: new Date(),
      answers: [],
      tabSwitchCount: 2,
      violationCount: 6,
      terminationReason: 'Exceeded max integrity violations (5).',
    });

    // A clean, fully legitimate session — should NOT show up in the feed.
    await Session.create({
      userId: candidate._id,
      direction: 'frontend',
      questionIds: [],
      optionOrders: [],
      status: 'submitted',
      startTime: new Date(),
      deadline: new Date(Date.now() + 60_000),
      endTime: new Date(),
      answers: [],
      tabSwitchCount: 0,
      violationCount: 0,
    });

    const res = await request(app)
      .get('/api/admin/violations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const entry = res.body.data[0];
    expect(entry.sessionId).toBe(flaggedSession._id.toString());
    expect(entry.status).toBe('terminated');
    expect(entry.tabSwitchCount).toBe(2);
    expect(entry.violationCount).toBe(6);
    expect(entry.terminationReason).toMatch(/violations/i);
    expect(entry.user).toEqual({
      id: candidate._id.toString(),
      name: candidate.name,
      email: candidate.email,
    });
  });
});
