import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { env } from '../../src/config/env';
import {
  PASSWORD,
  registerAgent,
  setupOrganizer,
  uniqueEmail,
} from '../helpers';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../src/modules/auth/auth.types';

const app = createApp();

describe('JWT Authentication & Session Security', () => {
  describe('1. Role-based Expiration', () => {
    it('issues tokens with correct expiration for USER (15m access, 7d refresh)', async () => {
      const email = uniqueEmail('jwt-user');
      const { userId } = await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.data.accessToken as string;
      const decoded = jwt.decode(accessToken) as AccessTokenPayload & { exp: number; iat: number };

      expect(decoded.role).toBe('USER');
      // 15 minutes = 900 seconds
      expect(decoded.exp - decoded.iat).toBe(900);

      const session = await prisma.refreshSession.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).toBeTruthy();
      const refreshDurationSec = Math.round((session!.expiresAt.getTime() - session!.createdAt.getTime()) / 1000);
      // 7 days = 604800 seconds (allow small margin)
      expect(refreshDurationSec).toBeGreaterThanOrEqual(604700);
      expect(refreshDurationSec).toBeLessThanOrEqual(604900);
    });

    it('issues tokens with correct expiration for CREATOR (15m access, 7d refresh)', async () => {
      const organizer = await setupOrganizer(app);
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: organizer.email, password: PASSWORD });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.data.accessToken as string;
      const decoded = jwt.decode(accessToken) as AccessTokenPayload & { exp: number; iat: number };

      expect(decoded.role).toBe('CREATOR');
      // 15 minutes = 900 seconds
      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it('issues tokens with correct expiration for ADMIN (10m access, 12h refresh)', async () => {
      const email = uniqueEmail('jwt-admin');
      const { userId } = await registerAgent(app, email);
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.data.accessToken as string;
      const decoded = jwt.decode(accessToken) as AccessTokenPayload & { exp: number; iat: number };

      expect(decoded.role).toBe('ADMIN');
      // 10 minutes = 600 seconds
      expect(decoded.exp - decoded.iat).toBe(600);

      const session = await prisma.refreshSession.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      const refreshDurationSec = Math.round((session!.expiresAt.getTime() - session!.createdAt.getTime()) / 1000);
      // 12 hours = 43200 seconds
      expect(refreshDurationSec).toBeGreaterThanOrEqual(43100);
      expect(refreshDurationSec).toBeLessThanOrEqual(43300);
    });

    it('issues tokens with correct expiration for SUPERADMIN (5m access, 4h refresh)', async () => {
      const email = uniqueEmail('jwt-superadmin');
      const { userId } = await registerAgent(app, email);
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'SUPERADMIN' },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.data.accessToken as string;
      const decoded = jwt.decode(accessToken) as AccessTokenPayload & { exp: number; iat: number };

      expect(decoded.role).toBe('SUPERADMIN');
      // 5 minutes = 300 seconds
      expect(decoded.exp - decoded.iat).toBe(300);

      const session = await prisma.refreshSession.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      const refreshDurationSec = Math.round((session!.expiresAt.getTime() - session!.createdAt.getTime()) / 1000);
      // 4 hours = 14400 seconds
      expect(refreshDurationSec).toBeGreaterThanOrEqual(14300);
      expect(refreshDurationSec).toBeLessThanOrEqual(14500);
    });
  });

  describe('2. Token Separation and Bearer Header Authorization', () => {
    it('allows access to protected routes with Authorization Bearer header', async () => {
      const email = uniqueEmail('bearer-auth');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      const accessToken = loginRes.body.data.accessToken;

      // Access without any cookies, purely via Bearer header
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(email);
    });

    it('rejects access tokens with invalid or tampered signatures', async () => {
      const forgedToken = jwt.sign(
        { sub: 'some-user', role: 'SUPERADMIN', type: 'access' },
        'attacker-secret-that-does-not-match-jwt-access-secret',
        { expiresIn: '15m' },
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });

    it('rejects using a refresh token as an access token on business routes', async () => {
      const email = uniqueEmail('separation');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('gf_refresh='));
      const rawRefreshToken = refreshCookie?.split(';')[0]?.split('=')[1] ?? '';

      // Send refresh token as Bearer token to /auth/me
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${rawRefreshToken}`);

      expect(meRes.status).toBe(401);
    });

    it('rejects using an access token on /auth/refresh', async () => {
      const email = uniqueEmail('access-on-refresh');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      const accessToken = loginRes.body.data.accessToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `gf_refresh=${accessToken}`);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('3. Refresh Token Rotation and Replay Theft Detection', () => {
    it('rotates refresh token and invalidates old token', async () => {
      const email = uniqueEmail('rtr-flow');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      const cookies1 = loginRes.headers['set-cookie'] as unknown as string[];
      const refresh1 = cookies1.find((c) => c.startsWith('gf_refresh='));

      // Perform refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refresh1!);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const cookies2 = refreshRes.headers['set-cookie'] as unknown as string[];
      const refresh2 = cookies2.find((c) => c.startsWith('gf_refresh='));
      expect(refresh2).toBeDefined();
      expect(refresh2).not.toEqual(refresh1);
    });

    it('detects replay attack of old refresh token and revokes entire family', async () => {
      const email = uniqueEmail('rtr-theft');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      const cookies1 = loginRes.headers['set-cookie'] as unknown as string[];
      const oldRefreshCookie = cookies1.find((c) => c.startsWith('gf_refresh='))!;

      // Legitimate user refreshes token
      const legitRefreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie);

      expect(legitRefreshRes.status).toBe(200);
      const cookies2 = legitRefreshRes.headers['set-cookie'] as unknown as string[];
      const newRefreshCookie = cookies2.find((c) => c.startsWith('gf_refresh='))!;

      // Attacker attempts to replay the oldRefreshCookie
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe('SESSION_REUSED');

      // Decode old refresh token to find its familyId
      const oldToken = oldRefreshCookie.split(';')[0]?.split('=')[1] ?? '';
      const decodedOld = jwt.decode(oldToken) as unknown as RefreshTokenPayload;
      const familyId = decodedOld.familyId!;

      // Verify all sessions in that family have been revoked in database
      const revokedSessions = await prisma.refreshSession.findMany({
        where: { familyId },
      });
      expect(revokedSessions.length).toBeGreaterThanOrEqual(2);
      for (const s of revokedSessions) {
        expect(s.revokedAt).not.toBeNull();
      }

      // Legitimate user now tries to use newRefreshCookie - it must also be revoked due to theft detection!
      const userBlockedRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', newRefreshCookie);

      expect(userBlockedRes.status).toBe(401);
    });

    it('handles concurrent refresh requests safely without accidental logout', async () => {
      const email = uniqueEmail('concurrent-refresh');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });

      const cookies1 = loginRes.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies1.find((c) => c.startsWith('gf_refresh='))!;

      // Fire 3 simultaneous refresh requests with the same refresh token
      const [res1, res2, res3] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
        request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
        request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
      ]);

      // All parallel requests must succeed without tripping reuse detection
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      // Access tokens returned should be valid
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${res1.body.data.accessToken}`);
      expect(meRes.status).toBe(200);
    });
  });

  describe('4. Session Management & Device Tracking', () => {
    it('lists active sessions with device and IP information', async () => {
      const email = uniqueEmail('sessions-list');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')
        .send({ email, password: PASSWORD });

      const accessToken = loginRes.body.data.accessToken;

      const sessionsRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(sessionsRes.status).toBe(200);
      const sessions = sessionsRes.body.data.sessions;
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(1);

      const current = sessions.find((s: { isCurrent: boolean }) => s.isCurrent);
      expect(current).toBeDefined();
      expect(current.deviceInfo).toContain('Chrome');
      expect(current.deviceInfo).toContain('macOS');
    });

    it('revokes an individual session via DELETE /sessions/:sessionId', async () => {
      const email = uniqueEmail('revoke-session');
      await registerAgent(app, email);

      // Session 1 (Device A: Windows Chrome)
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
        .send({ email, password: PASSWORD });
      const tokenA = login1.body.data.accessToken;
      const refreshCookieA = (login1.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('gf_refresh='))!;

      // Session 2 (Device B: iPhone Safari)
      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Safari/604.1')
        .send({ email, password: PASSWORD });
      const tokenB = login2.body.data.accessToken;

      // Device B lists sessions to find Device A's sessionId
      const listRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${tokenB}`);

      const sessionA = listRes.body.data.sessions.find((s: { deviceInfo: string }) => s.deviceInfo && s.deviceInfo.includes('Windows'));
      expect(sessionA).toBeDefined();

      // Device B revokes Device A
      const deleteRes = await request(app)
        .delete(`/api/v1/auth/sessions/${sessionA.id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(deleteRes.status).toBe(200);

      // Device A can no longer access protected endpoints
      const checkA = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(checkA.status).toBe(401);

      // Device A can no longer refresh
      const refreshA = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookieA);
      expect(refreshA.status).toBe(401);

      // Device B is unaffected
      const checkB = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(checkB.status).toBe(200);
    });

    it('logs out all devices via POST /logout-all', async () => {
      const email = uniqueEmail('logout-all');
      await registerAgent(app, email);

      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });
      const token1 = login1.body.data.accessToken;

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });
      const token2 = login2.body.data.accessToken;

      // Call logout-all using token2
      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token2}`)
        .send();

      expect(logoutAllRes.status).toBe(200);
      expect(logoutAllRes.body.data.loggedOutAll).toBe(true);

      // Both tokens are now invalid
      const check1 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(check1.status).toBe(401);

      const check2 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(check2.status).toBe(401);
    });
  });

  describe('5. Sensitive Operation Re-Authentication', () => {
    it('issues a short-lived reauth token on POST /auth/reauth with correct password', async () => {
      const email = uniqueEmail('reauth-success');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });
      const accessToken = loginRes.body.data.accessToken;

      const reauthRes = await request(app)
        .post('/api/v1/auth/reauth')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: PASSWORD });

      expect(reauthRes.status).toBe(200);
      expect(reauthRes.body.data.reauthToken).toBeDefined();

      const decoded = jwt.verify(reauthRes.body.data.reauthToken, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      expect(decoded.type).toBe('reauth');
    });

    it('rejects POST /auth/reauth with incorrect password', async () => {
      const email = uniqueEmail('reauth-fail');
      await registerAgent(app, email);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD });
      const accessToken = loginRes.body.data.accessToken;

      const reauthRes = await request(app)
        .post('/api/v1/auth/reauth')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'WrongPassword999!' });

      expect(reauthRes.status).toBe(401);
      expect(reauthRes.body.error.code).toBe('INVALID_REAUTH_PASSWORD');
    });

    it('requires reauth when session is stale on sensitive endpoints', async () => {
      const organizer = await setupOrganizer(app);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: organizer.email, password: PASSWORD });
      const accessToken = loginRes.body.data.accessToken;
      const decoded = jwt.decode(accessToken) as AccessTokenPayload;

      // Age the session to make it stale (> 15 minutes ago)
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      await prisma.refreshSession.update({
        where: { id: decoded.sessionId },
        data: { createdAt: twentyMinutesAgo, lastReauthAt: null },
      });

      // Attempt sensitive action (bank account creation) without reauth
      const bankAccountPayload = {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolder: 'Organizer Uji',
      };

      const blockedRes = await request(app)
        .post('/api/v1/creator/bank-accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bankAccountPayload);

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error.code).toBe('REAUTH_REQUIRED');

      // Now obtain reauth token
      const reauthRes = await request(app)
        .post('/api/v1/auth/reauth')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: PASSWORD });

      const reauthToken = reauthRes.body.data.reauthToken;

      // Retry sensitive action with x-reauth-token header
      const allowedRes = await request(app)
        .post('/api/v1/creator/bank-accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-reauth-token', reauthToken)
        .send(bankAccountPayload);

      expect(allowedRes.status).toBe(201);
      expect(allowedRes.body.data.account.accountNumber).toContain('7890');
    });
  });
});
