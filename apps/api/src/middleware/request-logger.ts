import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url || !url.includes('?')) return url;
  const [pathname, query] = url.split('?');
  const params = new URLSearchParams(query);
  params.delete('token');
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${sanitizeUrl(req.url)} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${sanitizeUrl(req.url)} ${res.statusCode}`,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: sanitizeUrl(req.url),
      id: req.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  if (!req.id) {
    req.id = randomUUID();
    res.setHeader('x-request-id', req.id);
  }
  next();
}
