import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import projectRoutes from './routes/projects.routes';

/**
 * Builds the Express application (no listener attached).
 * Routes mount here; index.ts wraps this in an HTTP server.
 */
export function createApp(): Express {
  const app = express();

  // Security headers (CSP, HSTS, X-Frame-Options, ...).
  app.use(helmet());

  // CORS — restricted to the frontend origin, cookies allowed for JWT refresh.
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Body parsing.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Parse cookies (refresh token is delivered as an HTTP-only cookie).
  app.use(cookieParser());

  // Request logging (dev only).
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Routes.
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 + error handling — must be registered last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
