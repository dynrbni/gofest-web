import express from 'express';
import 'express-async-errors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { httpLogger } from './middleware/request-logger';
import { originCheck } from './middleware/origin-check';
import { v1Router } from './routes/v1';
import { docsRouter } from './docs/docs.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(httpLogger);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
      exposedHeaders: ['x-request-id'],
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(originCheck);

  app.use(
    '/api/v1/webhooks',
    express.raw({ type: 'application/json', limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use(
    '/uploads',
    express.static(path.resolve(env.STORAGE_DIR, 'public'), {
      maxAge: '7d',
      immutable: false,
      fallthrough: true,
    }),
  );

  app.use('/api/docs', docsRouter);
  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
