import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'client' | 'admin' | 'tech';

/** Data we embed in the access token (kept minimal — no sensitive fields). */
export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

/** Signs a short-lived (15m) HS256 access token. */
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/** Verifies a token and returns its payload, or throws if invalid/expired. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

/** Data in the refresh token — only the user id is needed to re-issue access. */
export interface RefreshTokenPayload {
  sub: string; // user id
}

/** Signs a long-lived (7d) refresh token with the separate refresh secret. */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

/** Verifies a refresh token and returns its payload, or throws if invalid. */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
