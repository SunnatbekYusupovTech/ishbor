import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { sweepOrphanedUploads } from '@/services/uploadCleanup';

/**
 * In-memory stand-in for the Cloudinary account's `ishbor-uploads` folder,
 * so the sweeper's Admin API calls (`resources` / `delete_resources`) never
 * touch a real Cloudinary account in tests.
 */
let resources: { public_id: string; created_at: string }[] = [];

vi.mock('@/services/imageStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/imageStorage')>();
  return {
    ...actual,
    cloudinaryClient: () => ({
      api: {
        resources: async () => ({ resources, next_cursor: undefined }),
        delete_resources: async (ids: string[]) => {
          resources = resources.filter((r) => !ids.includes(r.public_id));
        },
      },
    }),
  };
});

/** Adds a fake Cloudinary asset; `ageMs` back-dates its `created_at`. */
function makeAsset(uuid: string, ageMs = 0): string {
  const publicId = `ishbor-uploads/${uuid}`;
  resources.push({ public_id: publicId, created_at: new Date(Date.now() - ageMs).toISOString() });
  return `https://res.cloudinary.com/demo/image/upload/v1700000000/${publicId}.png`;
}

const exists = (uuid: string) => resources.some((r) => r.public_id === `ishbor-uploads/${uuid}`);

/**
 * The sweeper exists for one case the eager cleanups can't cover: an image
 * uploaded in the edit dialog that the user then abandons without saving.
 *
 * The grace period is the property that matters — a just-uploaded asset is
 * momentarily unreferenced by definition, so deleting on "unreferenced"
 * alone would race the user's own save and destroy a live upload.
 */
describe('sweepOrphanedUploads', () => {
  let mongo: MongoMemoryServer;
  const DAY = 24 * 60 * 60 * 1000;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    resources = [];
    await Promise.all([User.deleteMany({}), PortfolioItem.deleteMany({})]);
  });

  it('leaves a freshly uploaded asset alone even though nothing references it yet', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    makeAsset(uuid);

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(exists(uuid)).toBe(true);
  });

  it('deletes an old asset that nothing references', async () => {
    const uuid = '22222222-2222-2222-2222-222222222222';
    makeAsset(uuid, 2 * DAY);

    expect(await sweepOrphanedUploads()).toBe(1);
    expect(exists(uuid)).toBe(false);
  });

  it("keeps an old asset that is someone's avatar", async () => {
    const uuid = '33333333-3333-3333-3333-333333333333';
    const url = makeAsset(uuid, 2 * DAY);
    await User.create({
      name: 'Has Avatar',
      email: 'avatar@example.com',
      passwordHash: 'x',
      role: 'seeker',
      avatarUrl: url,
    });

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(exists(uuid)).toBe(true);
  });

  it("keeps an old asset that is someone's cover", async () => {
    const uuid = '44444444-4444-4444-4444-444444444444';
    const url = makeAsset(uuid, 2 * DAY);
    await User.create({
      name: 'Has Cover',
      email: 'cover@example.com',
      passwordHash: 'x',
      role: 'seeker',
      coverUrl: url,
    });

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(exists(uuid)).toBe(true);
  });

  it('keeps an old asset used as a portfolio preview', async () => {
    const uuid = '55555555-5555-5555-5555-555555555555';
    const url = makeAsset(uuid, 2 * DAY);
    await PortfolioItem.create({
      userId: new mongoose.Types.ObjectId(),
      title: 'Work',
      imageUrl: url,
    });

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(exists(uuid)).toBe(true);
  });

  it('sweeps only the abandoned assets, leaving referenced and recent ones', async () => {
    const abandoned = '66666666-6666-6666-6666-666666666666';
    const referenced = '77777777-7777-7777-7777-777777777777';
    const recent = '88888888-8888-8888-8888-888888888888';
    makeAsset(abandoned, 2 * DAY);
    const referencedUrl = makeAsset(referenced, 2 * DAY);
    makeAsset(recent);
    await User.create({
      name: 'Mixed',
      email: 'mixed@example.com',
      passwordHash: 'x',
      role: 'seeker',
      avatarUrl: referencedUrl,
    });

    expect(await sweepOrphanedUploads()).toBe(1);
    expect(exists(abandoned)).toBe(false);
    expect(exists(referenced)).toBe(true);
    expect(exists(recent)).toBe(true);
  });
});
