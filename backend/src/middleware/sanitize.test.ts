import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { sanitizeInput } from '@/middleware/sanitize';

function runMiddleware(req: Partial<Request>) {
  const next = vi.fn();
  sanitizeInput(req as Request, {} as Response, next);
  expect(next).toHaveBeenCalledOnce();
  return req;
}

describe('sanitizeInput', () => {
  it('strips top-level Mongo operator keys from the body', () => {
    const req = runMiddleware({ body: { email: { $ne: null }, password: 'x' } });
    expect(req.body).toEqual({ email: {}, password: 'x' });
  });

  it('strips nested operator keys at any depth', () => {
    const req = runMiddleware({
      body: { filter: { profile: { $gt: '' }, name: 'ok' } },
    });
    expect(req.body).toEqual({ filter: { profile: {}, name: 'ok' } });
  });

  it('strips dotted-path keys (e.g. "a.b") that could target nested fields', () => {
    const req = runMiddleware({ body: { 'passwordHash.salt': 'x', name: 'ok' } });
    expect(req.body).toEqual({ name: 'ok' });
  });

  it('sanitizes arrays of objects', () => {
    const req = runMiddleware({ body: { answers: [{ $where: 'x', userAnswer: 1 }] } });
    expect(req.body).toEqual({ answers: [{ userAnswer: 1 }] });
  });

  it('sanitizes query and params too, leaving normal values untouched', () => {
    const req = runMiddleware({
      query: { type: { $ne: 'vacancy' } as never, level: 'junior' as never },
      params: { sessionId: 'abc123' },
    });
    expect(req.query).toEqual({ type: {}, level: 'junior' });
    expect(req.params).toEqual({ sessionId: 'abc123' });
  });

  it('leaves a request with no body/query/params untouched', () => {
    const req: Partial<Request> = {};
    const next = vi.fn();
    sanitizeInput(req as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
