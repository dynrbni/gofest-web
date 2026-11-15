import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/error-handler';

function failingApp(error: Error) {
  const app = express();
  app.get('/events', (_req, _res, next) => next(error));
  app.use(errorHandler);
  return app;
}

describe('database outage responses', () => {
  it('returns a retryable 503 without exposing database credentials or paths', async () => {
    const error = new Prisma.PrismaClientInitializationError(
      'Cannot connect to postgres://secret:password@private-host/db',
      '4.16.2',
      'P1001',
    );
    const response = await request(failingApp(error)).get('/events');
    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('30');
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('private-host');
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  it('preserves 500 for unrelated application errors', async () => {
    const response = await request(failingApp(new Error('Unexpected application failure'))).get(
      '/events',
    );
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('treats an exhausted connection pool as temporary unavailability', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Pool timed out', {
      code: 'P2024',
      clientVersion: '4.16.2',
    });
    const response = await request(failingApp(error)).get('/events');
    expect(response.status).toBe(503);
  });
});
