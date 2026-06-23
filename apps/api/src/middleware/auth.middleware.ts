import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './error.middleware';
import { verifyAccessToken, type UserRole } from '../utils/jwt';

/**
 * Protects a route: requires a valid `Authorization: Bearer <token>` header.
 * On success, attaches the decoded payload to `req.user`.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    // Keep next() outside the try so downstream errors aren't masked as 401s.
    throw new ApiError(401, 'Invalid or expired token');
  }

  req.user = payload;
  next();
}

/**
 * Restricts a route to the given role(s). Must run AFTER requireAuth, which
 * populates req.user. Returns 403 if the user's role isn't allowed.
 *
 *   router.get('/users', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Insufficient permissions');
    }
    next();
  };
}
