import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { Session } from '@/models/Session';
import { signAuthToken } from '@/utils/jwt';
import { env } from '@/config/env';

describe('POST /api/test/violation', () => {
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

  async function createInProgressSession() {
    const user = await User.create({
      name: 'Violation Tester',
      email: `violation-${Date.now()}@example.com`,
      passwordHash: 'irrelevant-for-this-test',
      role: 'seeker',
    });
    const session = await Session.create({
      userId: user._id,
      direction: 'frontend',
      questionIds: [],
      optionOrders: [],
      status: 'in-progress',
      startTime: new Date(),
      deadline: new Date(Date.now() + 60_000),
      answers: [],
      tabSwitchCount: 0,
      violationCount: 0,
    });
    const token = signAuthToken({ userId: user._id.toString(), email: user.email });
    return { token, sessionId: session._id.toString() };
  }

  it('increments violationCount and terminates once it exceeds env.maxViolations', async () => {
    const { token, sessionId } = await createInProgressSession();

    let lastBody: Record<string, unknown> = {};
    for (let i = 0; i < env.maxViolations; i++) {
      const res = await request(app)
        .post('/api/test/violation')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId, type: 'copy-paste' });
      expect(res.status).toBe(200);
      lastBody = res.body.data;
    }
    expect(lastBody.terminated).toBe(false);
    expect(lastBody.violationCount).toBe(env.maxViolations);

    const overLimit = await request(app)
      .post('/api/test/violation')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, type: 'copy-paste' });
    expect(overLimit.status).toBe(200);
    expect(overLimit.body.data.terminated).toBe(true);
    expect(overLimit.body.data.status).toBe('terminated');

    const session = await Session.findById(sessionId);
    expect(session?.status).toBe('terminated');
    expect(session?.terminationReason).toMatch(/violation/i);
  });

  it('rejects a violation on a session that is no longer active', async () => {
    const { token, sessionId } = await createInProgressSession();
    await Session.updateOne({ _id: sessionId }, { $set: { status: 'submitted' } });

    const res = await request(app)
      .post('/api/test/violation')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, type: 'copy-paste' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/test/violation')
      .send({ sessionId: '507f1f77bcf86cd799439011', type: 'copy-paste' });
    expect(res.status).toBe(401);
  });

  it.each(['copy-paste', 'right-click', 'screenshot-key', 'devtools'])(
    'accepts violation type "%s"',
    async (type) => {
      const { token, sessionId } = await createInProgressSession();
      const res = await request(app)
        .post('/api/test/violation')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId, type });
      expect(res.status).toBe(200);
      expect(res.body.data.violationCount).toBe(1);
    },
  );

  it('rejects an unknown violation type', async () => {
    const { token, sessionId } = await createInProgressSession();
    const res = await request(app)
      .post('/api/test/violation')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, type: 'not-a-real-type' });
    expect(res.status).toBe(400);
  });
});
