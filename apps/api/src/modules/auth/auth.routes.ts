import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  requestRegistrationOtpSchema,
  verifyRegistrationOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '@gofest/shared';
import { validate } from '../../middleware/validate';
import {
  authLimiter,
  passwordResetLimiter,
  registrationOtpLimiter,
} from '../../middleware/rate-limit';
import { requestRegistrationOtp, verifyRegistrationOtp } from './registration.service';
import { requireAuth } from '../../middleware/auth';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessTtlMs,
  authCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
  refreshTtlMs,
} from '../../lib/tokens';
import { ok, created } from '../../lib/response';
import {
  getMe,
  listSessions,
  login,
  logout,
  logoutAll,
  reauthenticate,
  refresh,
  register,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  updateProfile,
} from './auth.service';

export const authRouter = Router();

function resolveUserRole(roles?: string[]): string {
  if (!roles) return 'USER';
  if (roles.includes('SUPERADMIN')) return 'SUPERADMIN';
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('CREATOR') || roles.includes('ORGANIZER')) return 'CREATOR';
  return 'USER';
}

function setSessionCookies(
  res: Response,
  session: { accessToken: string; refreshToken: string; user: { roles: string[] } },
) {
  const role = resolveUserRole(session.user.roles);
  res.cookie(ACCESS_COOKIE, session.accessToken, authCookieOptions(accessTtlMs(role)));
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions(refreshTtlMs(role)));
}

function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, clearCookieOptions('/'));
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions('/api/v1/auth'));
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions('/'));
}

authRouter.post(
  '/register/request-otp',
  registrationOtpLimiter,
  validate(requestRegistrationOtpSchema),
  async (req, res) => {
    return ok(res, await requestRegistrationOtp(req.body.email));
  },
);

authRouter.post(
  '/register/verify-otp',
  authLimiter,
  validate(verifyRegistrationOtpSchema),
  async (req, res) => {
    return ok(res, await verifyRegistrationOtp(req.body.challengeId, req.body.code));
  },
);

authRouter.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const session = await register(req.body, req);
  setSessionCookies(res, session);
  return created(res, { user: session.user, accessToken: session.accessToken });
});

authRouter.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const session = await login(req.body, req);
  setSessionCookies(res, session);
  return ok(res, { user: session.user, accessToken: session.accessToken });
});

authRouter.post('/refresh', async (req, res) => {
  const rawToken = (req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken) as string | undefined;
  const session = await refresh(rawToken, req);
  setSessionCookies(res, session);
  return ok(res, { user: session.user, accessToken: session.accessToken });
});

authRouter.post('/logout', async (req, res) => {
  const rawToken = (req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken) as string | undefined;
  await logout(rawToken, req);
  clearSessionCookies(res);
  return ok(res, { loggedOut: true });
});

authRouter.post('/logout-all', requireAuth, async (req, res) => {
  await logoutAll(req.auth!.userId, req);
  clearSessionCookies(res);
  return ok(res, { loggedOutAll: true });
});

authRouter.get('/sessions', requireAuth, async (req, res) => {
  const sessions = await listSessions(req.auth!.userId, req.auth!.sessionId);
  return ok(res, { sessions });
});

authRouter.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  const result = await revokeSession(req.auth!.userId, req.params.sessionId!, req);
  if (req.auth!.sessionId === req.params.sessionId) {
    clearSessionCookies(res);
  }
  return ok(res, result);
});

const reauthSchema = z.object({
  password: z.string().min(1, 'Password wajib diisi'),
});

authRouter.post('/reauth', requireAuth, validate(reauthSchema), async (req, res) => {
  const result = await reauthenticate(req.auth!.userId, req.body.password, req);
  return ok(res, result);
});

authRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  async (req, res) => {
    await requestPasswordReset(req.body.email);
    return ok(res, {
      message:
        'Jika email tersebut terdaftar, kami sudah mengirim tautan untuk mengatur ulang password.',
    });
  },
);

authRouter.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  async (req, res) => {
    await resetPassword(req.body.token, req.body.password);
    clearSessionCookies(res);
    return ok(res, { message: 'Password berhasil diubah. Silakan masuk kembali.' });
  },
);

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await getMe(req.auth!.userId);
  return ok(res, { user });
});

authRouter.patch('/profile', requireAuth, validate(updateProfileSchema), async (req, res) => {
  const user = await updateProfile(req.auth!.userId, req.body);
  return ok(res, { user });
});
