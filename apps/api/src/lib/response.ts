import type { Response } from 'express';
import type { ApiResponse } from '@gofest/shared';

export function ok<T>(res: Response, data: T, meta: Record<string, unknown> | null = null) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta,
    error: null,
  };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, meta: Record<string, unknown> | null = null) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta,
    error: null,
  };
  return res.status(201).json(body);
}

export function noContent(res: Response) {
  return res.status(204).send();
}
