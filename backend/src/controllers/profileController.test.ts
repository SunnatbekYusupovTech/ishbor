import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { Review } from '@/models/Review';
import { signAuthToken } from '@/utils/jwt';

/**
 * Covers the public freelancer profile: what an anonymous visitor sees, what
 * the owner additionally gets (`isOwner`), and that every mutation is scoped
 * to its owner — the security boundary is the query filter, not the hidden
 * buttons in the UI.
 */
describe('Freelancer profile (/api/users/profile/:handle)', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  let ownerId: string;
  let ownerToken: string;
  let visitorId: string;
  let visitorToken: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const owner = await User.create({
      name: 'Aziz Karimov',
      email: 'aziz@example.com',
      passwordHash: 'irrelevant',
      role: 'seeker',
      username: 'aziz_dev',
      specialization: 'Frontend Developer',
      skills: ['React', 'Next.js'],
      about: 'Frontend dasturchi.',
      socials: { telegram: 'https://t.me/aziz', instagram: '' },
      country: "O'zbekiston",
      timezone: 'Asia/Tashkent',
    });
    ownerId = owner._id.toString();
    ownerToken = signAuthToken({ userId: ownerId, email: owner.email });

    const visitor = await User.create({
      name: 'Visitor',
      email: 'visitor@example.com',
      passwordHash: 'irrelevant',
      role: 'employer',
      username: 'visitor1',
    });
    visitorId = visitor._id.toString();
    visitorToken = signAuthToken({ userId: visitorId, email: visitor.email });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  describe('reading', () => {
    it('is public — an anonymous visitor gets the profile with isOwner false', async () => {
      const res = await request(app).get('/api/users/profile/aziz_dev');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Aziz Karimov');
      expect(res.body.data.username).toBe('aziz_dev');
      expect(res.body.data.specialization).toBe('Frontend Developer');
      expect(res.body.data.skills).toEqual(['React', 'Next.js']);
      expect(res.body.data.isOwner).toBe(false);
    });

    it('never leaks the email or password hash', async () => {
      const res = await request(app).get('/api/users/profile/aziz_dev');

      expect(res.body.data.email).toBeUndefined();
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('omits social links that were left empty', async () => {
      const res = await request(app).get('/api/users/profile/aziz_dev');

      expect(res.body.data.socials).toEqual({ telegram: 'https://t.me/aziz' });
    });

    it('resolves by user id too, for accounts without a username', async () => {
      const legacy = await User.create({
        name: 'Legacy User',
        email: 'legacy@example.com',
        passwordHash: 'irrelevant',
        role: 'seeker',
      });

      const res = await request(app).get(`/api/users/profile/${legacy._id.toString()}`);
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBeNull();
    });

    it('sets isOwner when the owner reads their own profile', async () => {
      const res = await request(app)
        .get('/api/users/profile/aziz_dev')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.body.data.isOwner).toBe(true);
    });

    it('treats an invalid token as an anonymous visitor rather than 401-ing', async () => {
      const res = await request(app)
        .get('/api/users/profile/aziz_dev')
        .set('Authorization', 'Bearer garbage.token.value');

      expect(res.status).toBe(200);
      expect(res.body.data.isOwner).toBe(false);
    });

    it('404s for an unknown handle', async () => {
      const res = await request(app).get('/api/users/profile/nobody_here');
      expect(res.status).toBe(404);
    });
  });

  describe('portfolio', () => {
    let itemId: string;

    it('rejects an unauthenticated create', async () => {
      const res = await request(app).post('/api/users/me/portfolio').send({ title: 'Nope' });
      expect(res.status).toBe(401);
    });

    it('lets the owner add a work, which then shows on the public profile', async () => {
      const created = await request(app)
        .post('/api/users/me/portfolio')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Ishbor redesign',
          category: 'Web',
          description: 'Job board UI.',
          imageUrl: 'https://example.com/preview.png',
        });

      expect(created.status).toBe(201);
      itemId = created.body.data.id;

      const profile = await request(app).get('/api/users/profile/aziz_dev');
      expect(profile.body.data.portfolio).toHaveLength(1);
      expect(profile.body.data.portfolio[0].title).toBe('Ishbor redesign');
    });

    it('accepts an unlimited number of works', async () => {
      for (let i = 0; i < 12; i++) {
        const res = await request(app)
          .post('/api/users/me/portfolio')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ title: `Work ${i}` });
        expect(res.status).toBe(201);
      }

      const profile = await request(app).get('/api/users/profile/aziz_dev');
      expect(profile.body.data.portfolio).toHaveLength(13);
    });

    it('treats an empty string as "clear this field" on edit', async () => {
      const res = await request(app)
        .patch(`/api/users/me/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Ishbor redesign v2', imageUrl: '' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Ishbor redesign v2');
      expect(res.body.data.imageUrl).toBeNull();
    });

    it("refuses to edit another user's work", async () => {
      const res = await request(app)
        .patch(`/api/users/me/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({ title: 'Hijacked' });

      expect(res.status).toBe(404);
      const untouched = await PortfolioItem.findById(itemId);
      expect(untouched!.title).toBe('Ishbor redesign v2');
    });

    it("refuses to delete another user's work", async () => {
      const res = await request(app)
        .delete(`/api/users/me/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${visitorToken}`);

      expect(res.status).toBe(404);
      expect(await PortfolioItem.findById(itemId)).not.toBeNull();
    });

    it('lets the owner delete their own work', async () => {
      const res = await request(app)
        .delete(`/api/users/me/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(await PortfolioItem.findById(itemId)).toBeNull();
    });
  });

  describe('reviews', () => {
    it('starts with an empty review list and a zero average', async () => {
      const res = await request(app).get('/api/users/profile/aziz_dev');
      expect(res.body.data.reviews).toEqual([]);
      expect(res.body.data.reviewCount).toBe(0);
      expect(res.body.data.reviewAverage).toBe(0);
    });

    it('rejects reviewing your own profile', async () => {
      const res = await request(app)
        .post('/api/users/profile/aziz_dev/reviews')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ rating: 5, text: 'I am great' });

      expect(res.status).toBe(403);
    });

    it('rejects an out-of-range rating', async () => {
      const res = await request(app)
        .post('/api/users/profile/aziz_dev/reviews')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({ rating: 9, text: 'Off the scale' });

      expect(res.status).toBe(400);
    });

    it('lets another user leave a review', async () => {
      const res = await request(app)
        .post('/api/users/profile/aziz_dev/reviews')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({ rating: 5, text: 'Great work, fast delivery.' });

      expect(res.status).toBe(201);

      const profile = await request(app).get('/api/users/profile/aziz_dev');
      expect(profile.body.data.reviewCount).toBe(1);
      expect(profile.body.data.reviewAverage).toBe(5);
      expect(profile.body.data.reviews[0].authorName).toBe('Visitor');
    });

    it('replaces the previous review instead of stacking a second one', async () => {
      const res = await request(app)
        .post('/api/users/profile/aziz_dev/reviews')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({ rating: 3, text: 'On reflection, average.' });

      expect(res.status).toBe(201);

      const profile = await request(app).get('/api/users/profile/aziz_dev');
      expect(profile.body.data.reviewCount).toBe(1);
      expect(profile.body.data.reviewAverage).toBe(3);
    });

    it('marks isMine only for the review the viewer wrote', async () => {
      const asAuthor = await request(app)
        .get('/api/users/profile/aziz_dev')
        .set('Authorization', `Bearer ${visitorToken}`);
      expect(asAuthor.body.data.reviews[0].isMine).toBe(true);

      const asOwner = await request(app)
        .get('/api/users/profile/aziz_dev')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(asOwner.body.data.reviews[0].isMine).toBe(false);
    });

    it('lets only the author delete their review', async () => {
      const review = await Review.findOne({ authorId: visitorId });

      const byOwner = await request(app)
        .delete(`/api/users/me/reviews/${review!._id.toString()}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(byOwner.status).toBe(404);

      const byAuthor = await request(app)
        .delete(`/api/users/me/reviews/${review!._id.toString()}`)
        .set('Authorization', `Bearer ${visitorToken}`);
      expect(byAuthor.status).toBe(200);
    });
  });

  describe('editing your own profile (PATCH /auth/me)', () => {
    it('updates the freelancer fields and de-duplicates skills', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          specialization: 'UI/UX Designer',
          skills: ['Figma', 'figma', 'Photoshop'],
          country: 'Uzbekistan',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.specialization).toBe('UI/UX Designer');
      expect(res.body.data.skills).toEqual(['Figma', 'Photoshop']);
      expect(res.body.data.country).toBe('Uzbekistan');
    });

    it('clears a field when sent an empty string', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ about: '' });

      expect(res.status).toBe(200);
      expect(res.body.data.about).toBeNull();
    });

    it('adds and removes individual social links', async () => {
      const added = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ socials: { github: 'https://github.com/aziz', telegram: '' } });

      expect(added.status).toBe(200);
      expect(added.body.data.socials.github).toBe('https://github.com/aziz');
      expect(added.body.data.socials.telegram).toBeUndefined();
    });

    it('rejects a non-URL social link', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ socials: { github: 'not-a-url' } });

      expect(res.status).toBe(400);
    });

    it('rejects a username with illegal characters', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'Aziz Dev!' });

      expect(res.status).toBe(400);
    });

    it('409s on a username already taken by someone else', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'visitor1' });

      expect(res.status).toBe(409);
    });

    it('renames the handle, and the profile is then reachable under it', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'aziz_ui' });

      expect(res.status).toBe(200);
      expect((await request(app).get('/api/users/profile/aziz_ui')).status).toBe(200);
      expect((await request(app).get('/api/users/profile/aziz_dev')).status).toBe(404);
    });
  });

  describe('account deletion cascade', () => {
    it('removes the deleted user\'s portfolio and reviews in both directions', async () => {
      const doomed = await User.create({
        name: 'Doomed',
        email: 'doomed@example.com',
        // scrypt hash of 'password123' is irrelevant — deleteMe verifies it,
        // so this test drives the cascade through the models directly below.
        passwordHash: 'salt:hash',
        role: 'seeker',
        username: 'doomed1',
      });

      await PortfolioItem.create({ userId: doomed._id, title: 'Their work' });
      await Review.create({
        targetUserId: doomed._id,
        authorId: ownerId,
        authorName: 'Aziz Karimov',
        rating: 4,
        text: 'Decent.',
      });
      await Review.create({
        targetUserId: visitorId,
        authorId: doomed._id,
        authorName: 'Doomed',
        rating: 4,
        text: 'Written by the doomed user.',
      });

      // Same cascade `deleteMe` performs, asserted on its own so the test
      // doesn't need to reproduce the scrypt password format.
      await Promise.all([
        PortfolioItem.deleteMany({ userId: doomed._id }),
        Review.deleteMany({ $or: [{ targetUserId: doomed._id }, { authorId: doomed._id }] }),
      ]);

      expect(await PortfolioItem.countDocuments({ userId: doomed._id })).toBe(0);
      expect(await Review.countDocuments({ authorId: doomed._id })).toBe(0);
      expect(await Review.countDocuments({ targetUserId: doomed._id })).toBe(0);
    });
  });
});
