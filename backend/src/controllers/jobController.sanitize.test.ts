import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { Job } from '@/models/Job';

/**
 * Demonstrates the real-world reason `sanitizeInput` exists: `listJobs` builds
 * its Mongo filter straight from `req.query` with no Zod schema in front of
 * it (`routes/jobRoutes.ts` has no `validate(...)` on the GET route). Without
 * sanitization, `?type[$ne]=vacancy` is parsed by the query-string parser
 * into `{ type: { $ne: 'vacancy' } }` and passed to `Job.find()` verbatim —
 * a classic Mongo operator-injection filter bypass.
 */
describe('GET /api/jobs — NoSQL operator injection is neutralised', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const employer = await User.create({
      name: 'Employer',
      email: 'employer-sanitize@example.com',
      passwordHash: 'irrelevant',
      role: 'employer',
    });
    await Job.create({
      type: 'vacancy',
      title: 'Backend engineer',
      company: 'Acme',
      description: 'desc',
      level: 'middle',
      stack: 'backend',
      postedBy: employer._id,
      postedByName: employer.name,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('a plain type filter matches normally (control)', async () => {
    const res = await request(app).get('/api/jobs').query({ type: 'vacancy' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('an injected $ne operator does not bypass the filter or crash the server', async () => {
    // qs (Express's default query parser) turns this into { type: { $ne: 'vacancy' } }.
    const res = await request(app).get('/api/jobs?type[$ne]=vacancy');
    // Sanitized down to `{ type: {} }` — Mongoose then rejects casting an
    // object to the `type` field's String schema (400, handled cleanly by
    // the global error handler). The operator itself never reaches Mongo:
    // it fails safe (rejected) instead of bypassing the filter (returning
    // everything, which is what `{ $ne: 'vacancy' }` would have done
    // unsanitized) or crashing the process.
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('an injected $where does not reach Mongo', async () => {
    const res = await request(app).get(
      '/api/jobs?stack[$where]=' + encodeURIComponent('sleep(3000) || true'),
    );
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
