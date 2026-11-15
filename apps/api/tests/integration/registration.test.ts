import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { renderEmail } from '../../src/modules/notifications/email.templates';
import { verifiedRegistration } from '../helpers';

const app = createApp();
const input = {
  name: 'Pengguna Baru',
  username: 'pengguna_baru',
  email: 'baru@example.com',
  phone: '081234567890',
  password: 'Rahasia123!',
};
async function sentCode(email = input.email) {
  const response = await request(app).post('/api/v1/auth/register/request-otp').send({ email });
  expect(response.status).toBe(200);
  const outbox = await prisma.emailNotification.findFirstOrThrow({
    where: { to: email.trim().toLowerCase(), template: 'REGISTRATION_OTP', status: 'PENDING' },
  });
  return {
    response,
    challengeId: response.body.data.challengeId as string,
    code: (outbox.payload as { code: string }).code,
    outbox,
  };
}
function verify(challengeId: string, code: string) {
  return request(app).post('/api/v1/auth/register/verify-otp').send({ challengeId, code });
}

describe('registration email verification', () => {
  it.each([
    'Aa1!',
    'abcdef1!',
    'ABCDEF1!',
    'Abcdefg!',
    'Abcdef12',
    'Abcdef1 ',
    'A'.repeat(71) + 'a1!',
  ])('rejects a password that does not meet every rule: %s', async (password) => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...input, password, verificationToken: 'x'.repeat(43) });
    expect(response.status).toBe(422);
    expect(
      response.body.error.details.some((detail: { path: string }) => detail.path === 'password'),
    ).toBe(true);
  });
  it('queues a real six-digit email without exposing the code or creating a user', async () => {
    const { response, challengeId, code, outbox } = await sentCode('  BARU@EXAMPLE.COM  ');
    expect(code).toMatch(/^\d{6}$/);
    expect(response.body.data).not.toHaveProperty('code');
    expect(response.body.data.testMode).toBe(false);
    expect(response.headers['set-cookie']).toBeUndefined();
    const challenge = await prisma.registrationChallenge.findUniqueOrThrow({
      where: { id: challengeId },
    });
    expect(challenge.codeHash).not.toBe(code);
    expect(challenge.email).toBe(input.email);
    expect(await prisma.user.count()).toBe(0);
    const rendered = renderEmail(outbox.template, outbox.payload as Record<string, unknown>);
    expect(rendered.text).toContain(code);
    expect(rendered.html).toContain('Verifikasi email Gofest');
  });
  it('rejects direct signup and unverified tokens', async () => {
    const direct = await request(app).post('/api/v1/auth/register').send(input);
    expect(direct.status).toBe(422);
    const blankPhone = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...input, phone: '   ', verificationToken: 'x'.repeat(43) });
    expect(blankPhone.status).toBe(422);
    const bypass = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...input, verificationToken: 'x'.repeat(43) });
    expect(bypass.status).toBe(400);
    expect(bypass.body.error.code).toBe('REGISTRATION_VERIFICATION_REQUIRED');
    expect(await prisma.user.count()).toBe(0);
  });
  it('enforces resend cooldown atomically across concurrent requests', async () => {
    const responses = await Promise.all(
      [0, 1].map(() =>
        request(app).post('/api/v1/auth/register/request-otp').send({ email: input.email }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 429]);
    expect(await prisma.emailNotification.count({ where: { status: 'PENDING' } })).toBe(1);
  });
  it('persists five wrong attempts and blocks a correct sixth guess', async () => {
    const { challengeId, code } = await sentCode();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await verify(challengeId, wrong)).status).toBe(400);
    expect((await verify(challengeId, code)).status).toBe(400);
    expect(
      (await prisma.registrationChallenge.findUniqueOrThrow({ where: { id: challengeId } }))
        .attempts,
    ).toBe(5);
  });
  it('rejects expired codes and invalidates the previous code on resend', async () => {
    const first = await sentCode();
    await prisma.registrationChallenge.update({
      where: { id: first.challengeId },
      data: { expiresAt: new Date(0), resendAt: new Date(0) },
    });
    expect((await verify(first.challengeId, first.code)).status).toBe(400);
    const second = await sentCode();
    // A random resend may choose the same six digits; compare against another wrong code in that case.
    const old =
      first.code === second.code ? (second.code === '000000' ? '111111' : '000000') : first.code;
    expect((await verify(first.challengeId, old)).status).toBe(400);
    expect((await verify(second.challengeId, second.code)).status).toBe(200);
    expect(await prisma.emailNotification.count({ where: { status: 'PENDING' } })).toBe(1);
  });
  it('issues a single proof when the same code is verified concurrently', async () => {
    const { challengeId, code } = await sentCode();
    const responses = await Promise.all([verify(challengeId, code), verify(challengeId, code)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
  });
  it('binds proof to its email, consumes it once and sets emailVerifiedAt', async () => {
    const payload = await verifiedRegistration(app, input);
    const mismatch = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, email: 'other@example.com' });
    expect(mismatch.status).toBe(400);
    const responses = await Promise.all(
      [0, 1].map(() => request(app).post('/api/v1/auth/register').send(payload)),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => [400, 409].includes(r.status))).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user.username).toBe(input.username);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(await prisma.registrationChallenge.count()).toBe(0);
  });
  it('rejects expired proof and keeps verification when a username is taken', async () => {
    const first = await verifiedRegistration(app, input);
    expect((await request(app).post('/api/v1/auth/register').send(first)).status).toBe(201);
    const second = await verifiedRegistration(app, { ...input, email: 'second@example.com' });
    const conflict = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...second, username: input.username.toUpperCase() });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('USERNAME_TAKEN');
    await prisma.registrationChallenge.update({
      where: { email: second.email },
      data: { proofExpiresAt: new Date(0) },
    });
    const expired = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...second, username: 'second_user' });
    expect(expired.status).toBe(400);
  });
  it('rejects a previously issued proof after requesting another code', async () => {
    const first = await verifiedRegistration(app, input);
    await prisma.registrationChallenge.update({
      where: { email: input.email },
      data: { resendAt: new Date(0) },
    });
    await sentCode();
    expect((await request(app).post('/api/v1/auth/register').send(first)).status).toBe(400);
  });
  it('preserves verification when two accounts claim the same username concurrently', async () => {
    const first = await verifiedRegistration(app, input);
    const second = await verifiedRegistration(app, { ...input, email: 'second@example.com' });
    const responses = await Promise.all(
      [first, second].map((payload) => request(app).post('/api/v1/auth/register').send(payload)),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const conflict = responses.findIndex((response) => response.status === 409);
    expect(responses[conflict]!.body.error.code).toBe('USERNAME_TAKEN');
    const retry = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...[first, second][conflict], username: 'another_username' });
    expect(retry.status).toBe(201);
  });
  it('caps wrong attempts even when guesses arrive concurrently', async () => {
    const { challengeId, code } = await sentCode();
    const wrong = code === '000000' ? '111111' : '000000';
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => verify(challengeId, wrong)),
    );
    expect(responses.every((response) => response.status === 400)).toBe(true);
    expect(
      (await prisma.registrationChallenge.findUniqueOrThrow({ where: { id: challengeId } }))
        .attempts,
    ).toBe(5);
    expect((await verify(challengeId, code)).status).toBe(400);
  });
});
