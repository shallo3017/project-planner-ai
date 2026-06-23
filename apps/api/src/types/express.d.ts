import type { AccessTokenPayload } from '../utils/jwt';

/**
 * Adds `req.user` to Express requests, populated by the auth middleware
 * after a valid JWT is verified.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
