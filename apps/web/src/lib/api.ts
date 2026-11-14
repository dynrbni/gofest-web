import type { ApiErrorDetail, PaginationMeta } from '@gofest/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[];
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  orderToken?: string;
}

const API_BASE = '/api/v1';

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: PaginationMeta | Record<string, unknown> | null }> {
  const { body, query, orderToken, headers: rawHeaders, ...rest } = options;
  const headers = new Headers(rawHeaders);
  headers.set('Accept', 'application/json');
  if (orderToken) headers.set('x-order-token', orderToken);

  let payloadBody: BodyInit | undefined;
  if (body instanceof FormData) {
    payloadBody = body;
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    payloadBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      credentials: 'include',
      ...rest,
      headers,
      body: payloadBody,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
    );
  }

  const parsed = await parseResponse(response);
  if (!response.ok) {
    const envelope = parsed as {
      error?: { code?: string; message?: string; details?: ApiErrorDetail[]; requestId?: string };
    } | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'REQUEST_FAILED',
      envelope?.error?.message ?? 'Permintaan gagal diproses.',
      envelope?.error?.details,
      envelope?.error?.requestId,
    );
  }

  const envelope = parsed as { data?: T; meta?: Record<string, unknown> | null } | null;
  return {
    data: (envelope?.data ?? null) as T,
    meta: envelope?.meta ?? null,
  };
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await request<T>(path, options);
  return data;
}

export async function apiPage<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const { data, meta } = await request<T[]>(path, options);
  return {
    data: data ?? [],
    meta: (meta as PaginationMeta | null) ?? { page: 1, limit: 10, total: 0, totalPages: 1 },
  };
}

export async function downloadFile(path: string, filename: string, orderToken?: string) {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      ...(orderToken ? { 'x-order-token': orderToken } : {}),
    },
  });
  if (!response.ok) {
    throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'File tidak dapat diunduh.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Terjadi kesalahan. Coba lagi.';
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {};
  return Object.fromEntries(error.details.map((detail) => [detail.path, detail.message]));
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.code.startsWith('SESSION_'));
}