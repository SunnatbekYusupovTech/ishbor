import type { AuthTokenPayload } from '@/utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware. */
      user?: AuthTokenPayload;
    }
  }
}

export {};
