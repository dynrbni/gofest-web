import { Router, type Response } from 'express';
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
  refreshTtlMs,
} from '../../lib/tokens';
import { ok, created } from '../../lib/response';
import {
  getMe,
  login,
  logout,
  refresh,
  register,
  requestPasswordReset,
  resetPassword,
  updateProfile,
} from './auth.service';

export const authRouter = Router();

function setSessionCookies(res: Response, session: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, session.accessToken, authCookieOptions(accessTtlMs()));
  res.cookie(REFRESH_COOKIE, session.refreshToken, authCookieOptions(refreshTtlMs()));
}

function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
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
  return created(res, { user: session.user });
});

authRouter.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const session = await login(req.body, req);
  setSessionCookies(res, session);
  return ok(res, { user: session.user });
});

authRouter.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const session = await refresh(rawToken, req);
  setSessionCookies(res, session);
  return ok(res, { user: session.user });
});

authRouter.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await logout(rawToken);
  clearSessionCookies(res);
  return ok(res, { loggedOut: true });
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
