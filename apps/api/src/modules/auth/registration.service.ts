import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { hmacSha256, randomToken, safeCompare, sha256 } from '../../lib/crypto';
import { BadRequestError, ConflictError, TooManyRequestsError } from '../../lib/errors';
import { enqueueEmail } from '../notifications/email.service';

function otpHash(email: string, code: string) {
  return hmacSha256(env.AUTH_REFRESH_TOKEN_SECRET, `registration:${email}:${code}`);
}

export async function requestRegistrationOtp(email: string) {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new ConflictError('Email sudah terdaftar. Silakan masuk.', 'EMAIL_ALREADY_REGISTERED');
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000);
  const resendAt = new Date(now.getTime() + 60_000);
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.registrationChallenge.findUnique({ where: { email } });
      const data = {
        codeHash: otpHash(email, code),
        expiresAt,
        resendAt,
        attempts: 0,
        verifiedAt: null,
        proofHash: null,
        proofExpiresAt: null,
      };
      let challengeId: string;
      if (existing) {
        const changed = await tx.registrationChallenge.updateMany({
          where: { id: existing.id, resendAt: { lte: now } },
          data,
        });
        if (changed.count !== 1)
          throw new TooManyRequestsError('Tunggu 60 detik sebelum mengirim kode lagi.');
        challengeId = existing.id;
      } else {
        const challenge = await tx.registrationChallenge.create({ data: { email, ...data } });
        challengeId = challenge.id;
      }
      await tx.emailNotification.updateMany({
        where: { to: email, template: 'REGISTRATION_OTP', status: 'PENDING' },
        data: { status: 'FAILED', error: 'Digantikan oleh kode baru' },
      });
      await enqueueEmail(
        {
          to: email,
          subject: 'Kode verifikasi akun Gofest',
          template: 'REGISTRATION_OTP',
          payload: { code, expiresMinutes: 10 },
        },
        tx,
      );
      return { challengeId, expiresAt, resendAt };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new TooManyRequestsError('Kode sedang dikirim. Tunggu 60 detik sebelum mencoba lagi.');
    }
    throw error;
  }
}

export async function verifyRegistrationOtp(challengeId: string, code: string) {
  const now = new Date();
  const verificationToken = randomToken(32);
  const proofExpiresAt = new Date(now.getTime() + 15 * 60_000);
  const email = await prisma.$transaction(async (tx) => {
    const challenge = await tx.registrationChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return null;
    const reserved = await tx.registrationChallenge.updateMany({
      where: {
        id: challengeId,
        codeHash: challenge.codeHash,
        verifiedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: 5 },
      },
      data: { attempts: { increment: 1 } },
    });
    if (reserved.count !== 1 || !safeCompare(challenge.codeHash, otpHash(challenge.email, code)))
      return null;
    const verified = await tx.registrationChallenge.updateMany({
      where: { id: challengeId, verifiedAt: null, codeHash: challenge.codeHash },
      data: { verifiedAt: now, proofHash: sha256(verificationToken), proofExpiresAt },
    });
    return verified.count === 1 ? challenge.email : null;
  });
  // Throw after committing so failed guesses consume their attempt allowance.
  if (!email)
    throw new BadRequestError(
      'Kode salah, kedaluwarsa, atau sudah dipakai. Maksimal 5 percobaan; minta kode baru bila perlu.',
      undefined,
      'INVALID_REGISTRATION_OTP',
    );
  return { email, verificationToken, expiresAt: proofExpiresAt };
}
