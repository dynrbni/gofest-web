import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { UnprocessableEntityError, zodIssuesToDetails } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new UnprocessableEntityError(
          'Data yang dikirim tidak valid',
          zodIssuesToDetails(result.error.issues),
        ),
      );
    }
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    return next();
  };
}
