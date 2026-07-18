import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validates `req.body`/`req.query`/`req.params` against a Zod schema.
 * On failure the ZodError is forwarded to the global error handler, which
 * returns a structured 400. Parsed/coerced values are written back so
 * controllers consume already-clean data.
 */
export const validate =
  (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) Object.assign(req.query, parsed.query);
    if (parsed.params) Object.assign(req.params, parsed.params);

    next();
  };
