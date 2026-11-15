import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { verifiedRegistration } from '../helpers';

const app = createApp();

const buyer = {
  username: 'budipembeli',
  email: 'budi@example.com',
  phone: '081234567890',
  password: 'Rahasia123',
};

describe('auth', () => {
  let registration: Awaited<ReturnType<typeof verifiedRegistration>>;
  beforeEach(async () => {
    registration = await verifiedRegistration(app, buyer);
  });
  it('registers a user and returns an active session', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/v1/auth/register').send(registration);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(buyer.email);
    expect(response.body.data.user.roles).toContain('USER');

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.name).toBe(buyer.username);
  });

  it('rejects duplicate email addresses', async () => {
    await request(app).post('/api/v1/auth/register').send(registration);
    const response = await request(app).post('/api/v1/auth/register').send(registration);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects an invalid password', async () => {
    await request(app).post('/api/v1/auth/register').send(registration);
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: buyer.email, password: 'Salah123' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh sessions and rejects reuse of the old token', async () => {
    const registerResponse = await request(app).post('/api/v1/auth/register').send(registration);
    const oldCookies = registerResponse.headers['set-cookie'] as unknown as string[];
    const oldRefresh = oldCookies.find((cookie) => cookie.startsWith('gf_refresh='));

    expect(oldRefresh).toBeTruthy();

    const firstRefresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldRefresh!);
    expect(firstRefresh.status).toBe(200);

    const reused = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldRefresh!);
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('SESSION_REUSED');
  });

  it('revokes the refresh session on logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(registration);

    const logout = await agent.post('/api/v1/auth/logout').send({});
    expect(logout.status).toBe(200);

    const refresh = await agent.post('/api/v1/auth/refresh').send({});
    expect(refresh.status).toBe(401);
  });

  it('resets a password through the email outbox token', async () => {
    await request(app).post('/api/v1/auth/register').send(registration);
    const forgot = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: buyer.email });
    expect(forgot.status).toBe(200);

    const email = await prisma.emailNotification.findFirst({
      where: { template: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'desc' },
    });
    expect(email).toBeTruthy();
    const payload = email!.payload as { resetUrl: string };
    const token = new URL(payload.resetUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'PasswordBaru123' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: buyer.email, password: buyer.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: buyer.email, password: 'PasswordBaru123' });
    expect(newLogin.status).toBe(200);
  });

  it('updates the profile of the current user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(registration);
    const response = await agent
      .patch('/api/v1/auth/profile')
      .send({ name: 'Budi Baru', phone: '081298765432' });
    expect(response.status).toBe(200);
    expect(response.body.data.user.name).toBe('Budi Baru');
  });
});
