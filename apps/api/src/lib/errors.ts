import type { ZodIssue } from 'zod';

export type ErrorDetail = { path: string; message: string };

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetail[];
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { details?: ErrorDetail[]; expose?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? statusCode < 500;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid', details?: ErrorDetail[]) {
    super(400, 'BAD_REQUEST', message, { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Kamu perlu masuk untuk melakukan ini', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Kamu tidak memiliki akses ke resource ini', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource tidak ditemukan', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Permintaan bentrok dengan data yang ada', code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Data tidak dapat diproses', details?: ErrorDetail[]) {
    super(422, 'UNPROCESSABLE_ENTITY', message, { details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Terlalu banyak percobaan. Coba lagi nanti.') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Layanan sedang tidak tersedia') {
    super(503, 'SERVICE_UNAVAILABLE', message, { expose: true });
  }
}

export function zodIssuesToDetails(issues: ZodIssue[]): ErrorDetail[] {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
