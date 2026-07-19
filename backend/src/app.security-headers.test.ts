import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { env } from '@/config/env';

describe('security headers (helmet)', () => {
  const app = createApp();

  it('sets a locked-down CSP (this server only ever emits JSON)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('marks itself explicitly cross-origin so the separate frontend origin can fetch it', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('sets the standard hardening headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeTruthy();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not send HSTS outside production (vitest runs with NODE_ENV=test)', async () => {
    expect(env.isProduction).toBe(false);
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
});
