import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.buyerIdentityNumber',
      'req.body.attendees',
      'checkoutDetails',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
    ],
    censor: '[REDACTED]',
  },
  transport: env.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
