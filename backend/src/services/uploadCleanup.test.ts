import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { User } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { sweepOrphanedUploads } from '@/services/uploadCleanup';

/**
 * Redirect the sweeper at a scratch directory. Without this the tests would
 * operate on the real upload directory — and since each test starts from an
 * empty database, any genuine file sitting there would look abandoned and be
 * deleted for real.
 */
const TEST_DIR = path.join(os.tmpdir(), 'ishbor-upload-cleanup-test');
vi.mock('@/services/imageStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/imageStorage')>();
  return { ...actual, uploadDir: () => TEST_DIR };
});

/**
 * The sweeper exists for one case the eager cleanups can't cover: an image
 * uploaded in the edit dialog that the user then abandons without saving.
 *
 * The grace period is the property that matters — a just-uploaded file is
 * momentarily unreferenced by definition, so deleting on "unreferenced"
 * alone would race the user's own save and destroy a live upload.
 */
describe('sweepOrphanedUploads', () => {
  let mongo: MongoMemoryServer;
  const dir = TEST_DIR;
  const DAY = 24 * 60 * 60 * 1000;

  /** Writes a fake upload; `ageMs` back-dates its mtime. */
  async function makeFile(name: string, ageMs = 0): Promise<string> {
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, 'x');
    if (ageMs > 0) {
      const when = new Date(Date.now() - ageMs);
      await fs.utimes(filePath, when, when);
    }
    return filePath;
  }

  const exists = (name: string) =>
    fs
      .access(path.join(dir, name))
      .then(() => true)
      .catch(() => false);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    // Each test starts from an empty directory AND an empty database, so a
    // file left behind by an earlier test can't be mistaken for an orphan here.
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([User.deleteMany({}), PortfolioItem.deleteMany({})]);
  });

  it('leaves a freshly uploaded file alone even though nothing references it yet', async () => {
    const name = '11111111-1111-1111-1111-111111111111.png';
    await makeFile(name);

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(await exists(name)).toBe(true);
  });

  it('deletes an old file that nothing references', async () => {
    const name = '22222222-2222-2222-2222-222222222222.png';
    await makeFile(name, 2 * DAY);

    expect(await sweepOrphanedUploads()).toBe(1);
    expect(await exists(name)).toBe(false);
  });

  it("keeps an old file that is someone's avatar", async () => {
    const name = '33333333-3333-3333-3333-333333333333.png';
    await makeFile(name, 2 * DAY);
    await User.create({
      name: 'Has Avatar',
      email: 'avatar@example.com',
      passwordHash: 'x',
      role: 'seeker',
      avatarUrl: `/uploads/${name}`,
    });

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(await exists(name)).toBe(true);
  });

  it("keeps an old file that is someone's cover", async () => {
    const name = '44444444-4444-4444-4444-444444444444.png';
    await makeFile(name, 2 * DAY);
    await User.create({
      name: 'Has Cover',
      email: 'cover@example.com',
      passwordHash: 'x',
      role: 'seeker',
      coverUrl: `/uploads/${name}`,
    });

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(await exists(name)).toBe(true);
  });

  it('keeps an old file used as a portfolio preview', async () => {
    const name = '55555555-5555-5555-5555-555555555555.png';
    await makeFile(name, 2 * DAY);
    await PortfolioItem.create({
      userId: new mongoose.Types.ObjectId(),
      title: 'Work',
      imageUrl: `/uploads/${name}`,
    });

    expect(await sweepOrphanedUploads()).toBe(0);
    expect(await exists(name)).toBe(true);
  });

  it('sweeps only the abandoned files, leaving referenced and recent ones', async () => {
    const abandoned = '66666666-6666-6666-6666-666666666666.png';
    const referenced = '77777777-7777-7777-7777-777777777777.png';
    const recent = '88888888-8888-8888-8888-888888888888.png';
    await makeFile(abandoned, 2 * DAY);
    await makeFile(referenced, 2 * DAY);
    await makeFile(recent);
    await User.create({
      name: 'Mixed',
      email: 'mixed@example.com',
      passwordHash: 'x',
      role: 'seeker',
      avatarUrl: `/uploads/${referenced}`,
    });

    expect(await sweepOrphanedUploads()).toBe(1);
    expect(await exists(abandoned)).toBe(false);
    expect(await exists(referenced)).toBe(true);
    expect(await exists(recent)).toBe(true);
  });
});
