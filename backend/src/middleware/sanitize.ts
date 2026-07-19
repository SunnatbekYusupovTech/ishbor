import type { NextFunction, Request, Response } from 'express';

/**
 * Recursively strips keys that look like Mongo operator injection
 * (`$ne`, `$gt`, `$where`, ...) or dotted-path injection (`a.b`), e.g.
 * `?type[$ne]=null` parsed by the query-string parser into
 * `{ type: { $ne: 'null' } }`. Zod covers shape/type validation on routes
 * that declare a schema; this is a blanket defense-in-depth layer for every
 * route (including ones without a schema, like the public job listing GET).
 */
function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }
  return value;
}

/** Sanitizes `req.body`, `req.query`, and `req.params` in place. */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query) as typeof req.query;
  if (req.params) req.params = sanitizeValue(req.params) as typeof req.params;
  next();
}
