import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { Prisma } from '../generated/prisma';

/** Lightweight HTTP error carrying an explicit status code. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 404 handler — reached when no route matched. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/** Central error handler — must keep the 4-arg signature for Express. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Known Prisma request errors (unique violation, not-found, bad ObjectId, …).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // unique constraint failed
        res.status(409).json({ error: 'A record with that value already exists' });
        return;
      case 'P2025': // record required but not found
        res.status(404).json({ error: 'Resource not found' });
        return;
      case 'P2023': // malformed ObjectId in the URL
        res.status(404).json({ error: 'Resource not found' });
        return;
      default:
        break;
    }
  }

  // Invalid data shape reaching Prisma (e.g. a bad enum value on a write).
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    ...(env.NODE_ENV === 'development' ? { message } : {}),
  });
}
