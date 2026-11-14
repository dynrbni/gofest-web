import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ForbiddenError } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || req.originalUrl.startsWith('/api/v1/webhooks/')) {
    return next();
  }

  const origin = req.get('origin');
  if (origin && origin !== env.WEB_URL) {
    throw new ForbiddenError('Origin permintaan tidak diizinkan', 'INVALID_ORIGIN');
  }
  return next();
}
