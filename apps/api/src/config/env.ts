import 'dotenv/config';
import { z } from 'zod';
import { canUseRegistrationTestOtp } from './registration-otp-mode';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:5173'),
  WORKER_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  DATABASE_URL_TEST: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET minimal 32 karakter').optional(),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET minimal 32 karakter').optional(),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32, 'AUTH_ACCESS_TOKEN_SECRET minimal 32 karakter').optional(),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(32, 'AUTH_REFRESH_TOKEN_SECRET minimal 32 karakter').optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ADMIN_ACCESS_EXPIRES_IN: z.string().default('10m'),
  JWT_ADMIN_REFRESH_EXPIRES_IN: z.string().default('12h'),
  JWT_SUPERADMIN_ACCESS_EXPIRES_IN: z.string().default('5m'),
  JWT_SUPERADMIN_REFRESH_EXPIRES_IN: z.string().default('4h'),
  AUTH_ACCESS_TOKEN_TTL: z.string().optional(),
  AUTH_REFRESH_TOKEN_TTL: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16, 'PAYMENT_WEBHOOK_SECRET minimal 16 karakter'),
  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  REGISTRATION_TEST_OTP: booleanString.default('false'),
  EMAIL_FROM: z.string().min(3).default('Gofest <no-reply@gofest.local>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  STORAGE_PROVIDER: z.enum(['local']).default('local'),
  STORAGE_DIR: z.string().default('./storage'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(20).default(5),
  ORDER_RESERVATION_MINUTES: z.coerce.number().int().min(5).max(120).default(15),
  PLATFORM_FEE_TYPE: z.enum(['none', 'fixed', 'percentage']).default('none'),
  PLATFORM_FEE_VALUE: z.coerce.number().int().min(0).default(0),
  EVENT_REVIEW_REQUIRED: booleanString.default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Konfigurasi environment tidak valid:\n${details}`);
}

const raw = parsed.data;
const databaseUrl =
  raw.NODE_ENV === 'test' ? (raw.DATABASE_URL_TEST ?? raw.DATABASE_URL) : raw.DATABASE_URL;

const jwtAccessSecret = raw.JWT_ACCESS_SECRET || raw.AUTH_ACCESS_TOKEN_SECRET;
const jwtRefreshSecret = raw.JWT_REFRESH_SECRET || raw.AUTH_REFRESH_TOKEN_SECRET;

if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET wajib diisi dan minimal 32 karakter');
}
if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
  throw new Error('JWT_REFRESH_SECRET wajib diisi dan minimal 32 karakter');
}
if (jwtAccessSecret === jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET harus berbeda');
}

const WEAK_SECRETS = new Set([
  'replace-with-long-random-secret',
  'secret',
  'jwt-secret',
  '12345678901234567890123456789012',
]);
if (WEAK_SECRETS.has(jwtAccessSecret) || WEAK_SECRETS.has(jwtRefreshSecret)) {
  if (raw.NODE_ENV === 'production') {
    throw new Error('JWT secrets tidak boleh menggunakan nilai default atau mudah ditebak di production');
  }
}

if (raw.NODE_ENV === 'production') {
  if (raw.REGISTRATION_TEST_OTP) {
    throw new Error('REGISTRATION_TEST_OTP tidak boleh diaktifkan di production');
  }
  if (raw.PAYMENT_PROVIDER === 'mock') {
    throw new Error('PAYMENT_PROVIDER=mock tidak boleh dipakai di production');
  }
  if (raw.EMAIL_PROVIDER === 'smtp' && (!raw.SMTP_HOST || !raw.SMTP_PORT)) {
    throw new Error('SMTP_HOST dan SMTP_PORT wajib diisi jika EMAIL_PROVIDER=smtp');
  }
  if (raw.EMAIL_PROVIDER === 'console') {
    throw new Error('EMAIL_PROVIDER=console tidak boleh dipakai di production');
  }
}

export const env = {
  ...raw,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  AUTH_ACCESS_TOKEN_SECRET: jwtAccessSecret,
  AUTH_REFRESH_TOKEN_SECRET: jwtRefreshSecret,
  JWT_ACCESS_EXPIRES_IN: raw.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: raw.JWT_REFRESH_EXPIRES_IN,
  JWT_ADMIN_ACCESS_EXPIRES_IN: raw.JWT_ADMIN_ACCESS_EXPIRES_IN,
  JWT_ADMIN_REFRESH_EXPIRES_IN: raw.JWT_ADMIN_REFRESH_EXPIRES_IN,
  JWT_SUPERADMIN_ACCESS_EXPIRES_IN: raw.JWT_SUPERADMIN_ACCESS_EXPIRES_IN,
  JWT_SUPERADMIN_REFRESH_EXPIRES_IN: raw.JWT_SUPERADMIN_REFRESH_EXPIRES_IN,
  AUTH_ACCESS_TOKEN_TTL: raw.JWT_ACCESS_EXPIRES_IN,
  AUTH_REFRESH_TOKEN_TTL: raw.JWT_REFRESH_EXPIRES_IN,
  DATABASE_URL: databaseUrl,
  registrationTestOtp: canUseRegistrationTestOtp(
    raw.NODE_ENV,
    raw.EMAIL_PROVIDER,
    raw.REGISTRATION_TEST_OTP,
  ),
  isDevelopment: raw.NODE_ENV === 'development',
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
};

export type Env = typeof env;
