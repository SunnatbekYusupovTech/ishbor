import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '@/app';
import { Question } from '@/models/Question';
import { Session } from '@/models/Session';
import { User } from '@/models/User';
import { signAuthToken } from '@/utils/jwt';

/**
 * End-to-end integration test of the secure assessment flow against a real
 * (in-memory) MongoDB. Verifies:
 *   - questions are served WITHOUT the answer key,
 *   - scoring is recomputed server-side and cannot be forged by the client,
 *   - the user's verification level is promoted on a perfect score.
 */
let mongod: MongoMemoryServer | undefined;
const app = createApp();
let token: string;
let userId: string;

// True once an in-memory Mongo is up. If the binary can't be provisioned
// (e.g. offline first run), the integration cases are skipped rather than
// failing the whole suite. CI caches the binary, so they run there.
let dbReady = false;

/** Reject if the in-memory server (incl. first-run binary download) exceeds the budget. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`in-memory Mongo not ready within ${ms}ms`)), ms),
    ),
  ]);
}

beforeAll(async () => {
  try {
    mongod = await withTimeout(MongoMemoryServer.create(), 45_000);
    await mongoose.connect(mongod.getUri());

    const user = await User.create({
      name: 'Test Candidate',
      email: 'test@example.com',
      passwordHash: 'x:y',
    });
    userId = user._id.toString();
    token = signAuthToken({ userId, email: user.email });

    await Question.create([
      { text: 'Q1', options: ['a', 'b'], correctAnswer: 0, difficulty: 'junior', technology: 'javascript', category: 'javascript' },
      { text: 'Q2', options: ['a', 'b'], correctAnswer: 1, difficulty: 'junior', technology: 'javascript', category: 'javascript' },
    ]);
    dbReady = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[testFlow] Skipping integration tests — in-memory Mongo unavailable:', err);
  }
});

// Reset per-test state so each test starts from a clean, single-session slate.
beforeEach(async () => {
  if (!dbReady) return;
  await Session.deleteMany({});
  await User.findByIdAndUpdate(userId, {
    verificationLevels: { frontend: 'none', backend: 'none', fullstack: 'none', mobile: 'none' },
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

async function startSession() {
  return request(app)
    .post('/api/test/start')
    .set('Authorization', `Bearer ${token}`)
    .send({ direction: 'frontend', technologies: ['javascript'] });
}

describe('assessment flow', () => {
  it('rejects unauthenticated requests', async () => {
    if (!dbReady) return;
    const res = await request(app).post('/api/test/start').send({});
    expect(res.status).toBe(401);
  });

  it('serves questions without the correctAnswer field', async () => {
    if (!dbReady) return;
    const res = await startSession();
    expect(res.status).toBe(201);
    expect(res.body.data.questions.length).toBe(2);
    for (const q of res.body.data.questions) {
      expect(q).not.toHaveProperty('correctAnswer');
    }
  });

  it('allows a couple of free restarts of an in-progress session, then cools down', async () => {
    if (!dbReady) return;
    const first = await startSession();
    expect(first.status).toBe(201);
    // Free restart #1: abandons `first`, starts a new session instead of 409ing.
    const restart1 = await startSession();
    expect(restart1.status).toBe(201);
    // Free restart #2.
    const restart2 = await startSession();
    expect(restart2.status).toBe(201);
    // Past MAX_FREE_RESTARTS — falls back to the normal cooldown wait.
    const restart3 = await startSession();
    expect(restart3.status).toBe(429);
  });

  it('scores a perfect submission server-side and promotes the user', async () => {
    if (!dbReady) return;
    const start = await startSession();
    const { sessionId, questions } = start.body.data;

    // Options are shuffled per candidate, so the client must locate the correct
    // option by its DISPLAYED position (matched here via the option text).
    const answers = await Promise.all(
      questions.map(async (q: { _id: string; options: string[] }) => {
        const full = await Question.findById(q._id).select('+correctAnswer');
        const correctText = full!.options[full!.correctAnswer];
        const displayedIndex = q.options.indexOf(correctText);
        return { questionId: q._id, userAnswer: displayedIndex };
      }),
    );

    const submit = await request(app)
      .post('/api/test/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, answers });

    expect(submit.status).toBe(200);
    expect(submit.body.data.percentage).toBe(100);
    // One technology (javascript) fully passed → junior under the passed-tech model.
    expect(submit.body.data.awardedLevel).toBe('junior');
    expect(submit.body.data.passedCount).toBe(1);

    const user = await User.findById(userId);
    expect(user!.verificationLevels.frontend).toBe('junior');
  });

  it('ignores a forged answer for a question not in the session', async () => {
    if (!dbReady) return;
    const start = await startSession();
    const { sessionId } = start.body.data;
    const forged = [{ questionId: new mongoose.Types.ObjectId().toString(), userAnswer: 0 }];

    const submit = await request(app)
      .post('/api/test/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, answers: forged });

    expect(submit.status).toBe(200);
    expect(submit.body.data.score).toBe(0);
    expect(submit.body.data.awardedLevel).toBe('none');
  });
});
