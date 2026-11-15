import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, zodIssuesToDetails } from '../lib/errors';
import { logger } from '../lib/logger';
import { isDatabaseUnavailable } from '../lib/database-errors';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    data: null,
    meta: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
      requestId: req.id,
    },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid',
        details: zodIssuesToDetails(err.issues),
        requestId: req.id,
      },
    });
  }

  if (isDatabaseUnavailable(err)) {
    logger.error({ err, requestId: req.id }, 'Koneksi database tidak tersedia');
    res.setHeader('Retry-After', '30');
    return res.status(503).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Layanan sedang tidak tersedia. Silakan coba lagi sebentar.',
        requestId: req.id,
      },
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.id }, err.message);
    }
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.id,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'CONFLICT',
          message: 'Data dengan nilai unik tersebut sudah ada',
          requestId: req.id,
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource tidak ditemukan',
          requestId: req.id,
        },
      });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'RELATION_CONFLICT',
          message: 'Data masih terhubung dengan resource lain',
          requestId: req.id,
        },
      });
    }
    if (err.code === 'P2034') {
      return res.status(409).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'TRANSACTION_CONFLICT',
          message: 'Transaksi bentrok dengan proses lain. Coba lagi.',
          requestId: req.id,
        },
      });
    }
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    data: null,
    meta: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan pada server',
      requestId: req.id,
    },
  });
}
