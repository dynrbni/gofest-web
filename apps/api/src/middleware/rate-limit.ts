import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env';

function handler(req: Request, res: Response) {
  res.status(429).json({
    success: false,
    data: null,
    meta: null,
    error: {
      code: 'RATE_LIMITED',
      message: 'Terlalu banyak percobaan. Coba lagi nanti.',
      requestId: req.id,
    },
  });
}

const base = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler,
};

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 12,
  message: undefined,
});

export const passwordResetLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

export const registrationOtpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

export const checkoutLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
});

export const checkInLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 180,
});

export const publicLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
});
