import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { Job } from '@/models/Job';
import { Application } from '@/models/Application';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { PortfolioItem } from '@/models/PortfolioItem';
import { signAuthToken } from '@/utils/jwt';
import { ACCESS_COOKIE } from '@/utils/cookies';

/**
 * The request (job application) flow: seeker → employer with the seeker's
 * FULL profile form, one auto-created chat thread per request.
 */
describe('Job applications (requests) + full seeker form', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  let employer: any;
  let seeker: any;
  let stranger: any;
  let vacancyId: string;
  let resumeId: string;

  const authCookie = (user: any) => `${ACCESS_COOKIE}=${signAuthToken({ userId: user._id.toString(), email: user.email })}`;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      Application.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      PortfolioItem.deleteMany({}),
    ]);

    employer = await User.create({
      name: 'Employer One',
      email: 'employer-one@example.com',
      passwordHash: 'x',
      role: 'employer',
    });
    seeker = await User.create({
      name: 'Seeker One',
      email: 'seeker-one@example.com',
      passwordHash: 'x',
      role: 'seeker',
      username: 'seekerone',
      specialization: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'Tailwind'],
      verificationLevels: { frontend: 'middle', backend: 'none', fullstack: 'none', mobile: 'none' },
      about: 'I build interfaces.',
      country: 'Uzbekistan',
    });
    stranger = await User.create({
      name: 'Stranger',
      email: 'stranger@example.com',
      passwordHash: 'x',
      role: 'employer',
    });

    const vacancy = await Job.create({
      type: 'vacancy',
      title: 'Frontend Dev needed',
      company: 'Acme',
      description: 'We need a frontend developer.',
      level: 'middle',
      stack: 'frontend',
      postedBy: employer._id,
      postedByName: employer.name,
    });
    vacancyId = vacancy._id.toString();

    const resume = await Job.create({
      type: 'resume',
      title: 'Frontend dev looking for work',
      description: 'Open to offers.',
      level: 'middle',
      stack: 'frontend',
      postedBy: seeker._id,
      postedByName: seeker.name,
    });
    resumeId = resume._id.toString();
  });

  it('requires authentication', async () => {
    const res = await request(app).post(`/api/jobs/${vacancyId}/apply`).send({});
    expect(res.status).toBe(401);
  });

  it('seeker applies → application + auto-created conversation + first message', async () => {
    const res = await request(app)
      .post(`/api/jobs/${vacancyId}/apply`)
      .set('Cookie', authCookie(seeker))
      .send({ message: 'I am interested!' });

    expect(res.status).toBe(201);
    expect(res.body.data.application.status).toBe('pending');
    expect(res.body.data.conversationId).toBeTruthy();

    const appDoc = await Application.findOne({ jobId: vacancyId, seekerId: seeker._id });
    expect(appDoc).not.toBeNull();
    expect(appDoc!.employerId.toString()).toBe(employer._id.toString());
    expect(appDoc!.message).toBe('I am interested!');

    const convo = await Conversation.findById(appDoc!.conversationId);
    expect(convo).not.toBeNull();
    expect(convo!.applicationId?.toString()).toBe(appDoc!._id.toString());
    expect([convo!.userA.toString(), convo!.userB.toString()]).toEqual(
      expect.arrayContaining([seeker._id.toString(), employer._id.toString()]),
    );

    const firstMessage = await Message.findOne({ conversationId: convo!._id });
    expect(firstMessage?.text).toBe('I am interested!');
    expect(firstMessage!.senderId.toString()).toBe(seeker._id.toString());
  });

  it('rejects a duplicate application for the same vacancy', async () => {
    await request(app).post(`/api/jobs/${vacancyId}/apply`).set('Cookie', authCookie(seeker)).send({});

    const res = await request(app).post(`/api/jobs/${vacancyId}/apply`).set('Cookie', authCookie(seeker)).send({});
    expect(res.status).toBe(409);
  });

  it('seeker cannot apply to a resume listing', async () => {
    const res = await request(app).post(`/api/jobs/${resumeId}/apply`).set('Cookie', authCookie(seeker)).send({});
    expect(res.status).toBe(400);
  });

  it('seeker cannot apply to their own listing', async () => {
    const res = await request(app).post(`/api/jobs/${resumeId}/apply`).set('Cookie', authCookie(seeker)).send({});
    expect(res.status).toBe(400);
  });

  it('employer sees every request with the seeker FULL profile form', async () => {
    await PortfolioItem.create({ userId: seeker._id, title: 'Cool App', imageUrl: 'https://cdn.example/cool.png' });
    await request(app).post(`/api/jobs/${vacancyId}/apply`).set('Cookie', authCookie(seeker)).send({ message: 'Hire me' });

    const res = await request(app)
      .get(`/api/jobs/${vacancyId}/applications`)
      .set('Cookie', authCookie(employer));

    expect(res.status).toBe(200);
    expect(res.body.data.applications).toHaveLength(1);

    const item = res.body.data.applications[0];
    expect(item.message).toBe('Hire me');
    expect(item.status).toBe('pending');
    expect(item.seeker).toBeTruthy();
    // The full form: header, skills, verification, portfolio, handle.
    expect(item.seeker.name).toBe('Seeker One');
    expect(item.seeker.username).toBe('seekerone');
    expect(item.seeker.specialization).toBe('Frontend Developer');
    expect(item.seeker.skills).toContain('React');
    expect(item.seeker.verificationLevels.frontend).toBe('middle');
    expect(item.seeker.about).toBe('I build interfaces.');
    expect(item.seeker.country).toBe('Uzbekistan');
    expect(item.seeker.handle).toBe('seekerone');
    expect(item.seeker.portfolio).toHaveLength(1);
    expect(item.seeker.portfolio[0].title).toBe('Cool App');

    // Reading the list marks the requests as seen.
    const seen = await Application.findOne({ jobId: vacancyId, seekerId: seeker._id });
    expect(seen!.seenByEmployer).toBe(true);
  });

  it('a stranger employer cannot view the vacancy applications', async () => {
    await request(app).post(`/api/jobs/${vacancyId}/apply`).set('Cookie', authCookie(seeker)).send({});

    const res = await request(app)
      .get(`/api/jobs/${vacancyId}/applications`)
      .set('Cookie', authCookie(stranger));
    expect(res.status).toBe(403);
  });

  it('employer can accept a request; a non-owner cannot', async () => {
    const applyRes = await request(app)
      .post(`/api/jobs/${vacancyId}/apply`)
      .set('Cookie', authCookie(seeker))
      .send({});
    const applicationId = applyRes.body.data.application.id;

    const strangerRes = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set('Cookie', authCookie(stranger))
      .send({ status: 'accepted' });
    expect(strangerRes.status).toBe(403);

    const res = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set('Cookie', authCookie(employer))
      .send({ status: 'accepted' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');

    const updated = await Application.findById(applicationId);
    expect(updated!.status).toBe('accepted');
  });

  it('seeker can list their own applications with the job/employer snippets', async () => {
    await request(app).post(`/api/jobs/${vacancyId}/apply`).set('Cookie', authCookie(seeker)).send({});

    const res = await request(app).get('/api/applications/mine').set('Cookie', authCookie(seeker));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].job.title).toBe('Frontend Dev needed');
    expect(res.body.data[0].employer.name).toBe('Employer One');
    expect(res.body.data[0].status).toBe('pending');
  });

  it('GET /jobs/:id reports appliedByMe for the seeker and applicationCount for the owner', async () => {
    await request(app).post(`/api/jobs/${vacancyId}/apply`).set('Cookie', authCookie(seeker)).send({});

    const seekerView = await request(app).get(`/api/jobs/${vacancyId}`).set('Cookie', authCookie(seeker));
    expect(seekerView.body.data.appliedByMe).toBe(true);
    expect(seekerView.body.data.myApplicationConversationId).toBeTruthy();
    expect(seekerView.body.data.applicationCount).toBe(0);

    const ownerView = await request(app).get(`/api/jobs/${vacancyId}`).set('Cookie', authCookie(employer));
    expect(ownerView.body.data.applicationCount).toBe(1);
  });
});
