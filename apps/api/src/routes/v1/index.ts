import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ServiceUnavailableError } from '../../lib/errors';

export const v1Router = Router();

v1Router.get('/', (_req, res) => {
  return ok(res, {
    name: 'Gofest API',
    version: 'v1',
    documentation: '/api/docs',
  });
});

v1Router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new ServiceUnavailableError('Database tidak dapat dijangkau');
  }
  return ok(res, {
    status: 'ok',
    service: 'gofest-api',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
});
