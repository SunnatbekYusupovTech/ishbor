import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { signAuthToken } from '@/utils/jwt';
import { uploadDir, detectImageFormat, isInternalUpload } from '@/services/imageStorage';

/**
 * Image uploads. The interesting cases here are the security ones: what the
 * request CLAIMS about a file (its mimetype, its filename) is attacker
 * controlled, so the tests assert the server decides from the bytes instead.
 */

/** Smallest valid headers for each format — enough for magic-byte detection. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(32)]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.alloc(4),
  Buffer.from('WEBP', 'latin1'),
  Buffer.alloc(32),
]);
const HTML = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', 'utf8');

describe('POST /api/uploads/image', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();
  let token: string;
  const written: string[] = [];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const user = await User.create({
      name: 'Uploader',
      email: 'uploader@example.com',
      passwordHash: 'irrelevant',
      role: 'seeker',
      username: 'uploader',
    });
    token = signAuthToken({ userId: user._id.toString(), email: user.email });
  });

  afterAll(async () => {
    // Clean up anything these tests wrote to the real upload directory.
    await Promise.all(
      written.map((url) =>
        fs.unlink(path.join(uploadDir(), path.basename(url))).catch(() => undefined),
      ),
    );
    await mongoose.disconnect();
    await mongo.stop();
  });

  const post = () => request(app).post('/api/uploads/image').set('Authorization', `Bearer ${token}`);

  it('rejects an unauthenticated upload', async () => {
    const res = await request(app)
      .post('/api/uploads/image')
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('stores a PNG and returns a relative /uploads path', async () => {
    const res = await post().attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.png$/);
    expect(res.body.data.mime).toBe('image/png');
    written.push(res.body.data.url);
  });

  it('serves the stored file back with nosniff', async () => {
    const upload = await post().attach('file', JPEG, {
      filename: 'b.jpg',
      contentType: 'image/jpeg',
    });
    written.push(upload.body.data.url);

    const res = await request(app).get(upload.body.data.url);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('accepts every supported format', async () => {
    for (const [buffer, mime] of [
      [GIF, 'image/gif'],
      [WEBP, 'image/webp'],
    ] as const) {
      const res = await post().attach('file', buffer, { filename: 'x', contentType: mime });
      expect(res.status).toBe(201);
      expect(res.body.data.mime).toBe(mime);
      written.push(res.body.data.url);
    }
  });

  it('never trusts the declared mimetype — HTML labelled image/png is rejected', async () => {
    const res = await post().attach('file', HTML, {
      filename: 'evil.png',
      contentType: 'image/png',
    });

    // Passed multer's filter on the claimed type, then failed the byte sniff.
    expect(res.status).toBe(400);
  });

  it('rejects SVG, which can carry script', async () => {
    const res = await post().attach('file', SVG, {
      filename: 'evil.svg',
      contentType: 'image/svg+xml',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a request with no file', async () => {
    const res = await post();
    expect(res.status).toBe(400);
  });

  it('never uses the caller-supplied filename', async () => {
    const res = await post().attach('file', PNG, {
      filename: '../../etc/passwd.png',
      contentType: 'image/png',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.png$/);
    expect(res.body.data.url).not.toContain('passwd');
    expect(res.body.data.url).not.toContain('..');
    written.push(res.body.data.url);
  });

  describe('detectImageFormat', () => {
    it('identifies formats from their leading bytes', () => {
      expect(detectImageFormat(PNG)?.ext).toBe('png');
      expect(detectImageFormat(JPEG)?.ext).toBe('jpg');
      expect(detectImageFormat(GIF)?.ext).toBe('gif');
      expect(detectImageFormat(WEBP)?.ext).toBe('webp');
    });

    it('returns null for non-images and for buffers too short to identify', () => {
      expect(detectImageFormat(HTML)).toBeNull();
      expect(detectImageFormat(SVG)).toBeNull();
      expect(detectImageFormat(Buffer.alloc(4))).toBeNull();
    });
  });

  describe('isInternalUpload', () => {
    it('accepts only our own generated paths', () => {
      expect(isInternalUpload('/uploads/0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0.png')).toBe(true);
      expect(isInternalUpload('https://example.com/a.png')).toBe(false);
      expect(isInternalUpload(null)).toBe(false);
    });

    it('rejects traversal attempts that merely start with the prefix', () => {
      expect(isInternalUpload('/uploads/../../../etc/passwd')).toBe(false);
      expect(isInternalUpload('/uploads/subdir/a.png')).toBe(false);
      expect(isInternalUpload('/uploads/a.png')).toBe(false); // not a UUID name
    });
  });
});
