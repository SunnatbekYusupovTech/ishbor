import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { Job } from '@/models/Job';
import { JobReport } from '@/models/JobReport';
import { signAuthToken } from '@/utils/jwt';
import { ACCESS_COOKIE } from '@/utils/cookies';

/** The "More" menu → "Report the vacancy" flow: file a complaint, never touch the listing. */
describe('Job reporting', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  let user: any;
  let vacancyId: string;

  const authCookie = (u: any) =>
    `${ACCESS_COOKIE}=${signAuthToken({ userId: u._id.toString(), email: u.email })}`;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Job.deleteMany({}), JobReport.deleteMany({})]);

    user = await User.create({
      name: 'Seeker One',
      email: 'seeker-one@example.com',
      passwordHash: 'x',
      role: 'seeker',
    });

    const vacancy = await Job.create({
      type: 'vacancy',
      title: 'Frontend Dev needed',
      company: 'Acme',
      description: 'We need a frontend developer.',
      level: 'middle',
      stack: 'frontend',
      postedBy: user._id,
      postedByName: user.name,
    });
    vacancyId = vacancy._id.toString();
  });

  it('creates a report with the chosen reason and note', async () => {
    const res = await request(app)
      .post(`/api/jobs/${vacancyId}/report`)
      .set('Cookie', authCookie(user))
      .send({ reason: 'fake', note: 'This looks like a scam.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const report = await JobReport.findOne({ jobId: new mongoose.Types.ObjectId(vacancyId) });
    expect(report).toBeTruthy();
    expect(report!.reason).toBe('fake');
    expect(report!.note).toBe('This looks like a scam.');
    expect(report!.jobTitle).toBe('Frontend Dev needed');
    expect(report!.company).toBe('Acme');
    expect(report!.reporterId.toString()).toBe(user._id.toString());
  });

  it('rejects an unknown reason', async () => {
    const res = await request(app)
      .post(`/api/jobs/${vacancyId}/report`)
      .set('Cookie', authCookie(user))
      .send({ reason: 'not-a-real-reason' });

    expect(res.status).toBe(400);
    await expect(JobReport.countDocuments()).resolves.toBe(0);
  });

  it('rejects unauthenticated reports', async () => {
    const res = await request(app).post(`/api/jobs/${vacancyId}/report`).send({ reason: 'spam' });

    expect(res.status).toBe(401);
    await expect(JobReport.countDocuments()).resolves.toBe(0);
  });

  it('rejects reporting a missing job', async () => {
    const res = await request(app)
      .post('/api/jobs/000000000000000000000000/report')
      .set('Cookie', authCookie(user))
      .send({ reason: 'spam' });

    expect(res.status).toBe(404);
    await expect(JobReport.countDocuments()).resolves.toBe(0);
  });

  it('allows re-reporting the same job (each report is its own row)', async () => {
    await request(app)
      .post(`/api/jobs/${vacancyId}/report`)
      .set('Cookie', authCookie(user))
      .send({ reason: 'spam' });
    const res = await request(app)
      .post(`/api/jobs/${vacancyId}/report`)
      .set('Cookie', authCookie(user))
      .send({ reason: 'inappropriate' });

    expect(res.status).toBe(201);
    await expect(JobReport.countDocuments()).resolves.toBe(2);
  });
});
