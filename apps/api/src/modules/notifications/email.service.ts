import type { EmailTemplate, Prisma } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { renderEmail } from './email.templates';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface EnqueueEmailInput {
  to: string;
  subject: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
}

export async function enqueueEmail(input: EnqueueEmailInput, db: DbClient = prisma) {
  return db.emailNotification.create({
    data: {
      to: input.to,
      subject: input.subject,
      template: input.template,
      payload: input.payload as PrismaNamespace.InputJsonValue,
    },
  });
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
    });
  }
  return transporter;
}

async function deliver(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (env.EMAIL_PROVIDER === 'console') {
    logger.info(
      {
        to: input.to,
        subject: input.subject,
        preview: input.text.slice(0, 500),
      },
      'Email dikirim melalui console provider',
    );
    return;
  }
  await getTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function processEmailQueue(limit = 20): Promise<number> {
  const pending = await prisma.emailNotification.findMany({
    where: {
      status: 'PENDING',
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  for (const email of pending) {
    try {
      const rendered = renderEmail(
        email.template,
        (email.payload ?? {}) as Record<string, unknown>,
      );
      await deliver({
        to: email.to,
        subject: email.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          provider: env.EMAIL_PROVIDER,
          sentAt: new Date(),
          attempts: { increment: 1 },
          error: null,
        },
      });
    } catch (error) {
      const attempts = email.attempts + 1;
      const message = error instanceof Error ? error.message : 'Email gagal dikirim';
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: {
          status: attempts >= 5 ? 'FAILED' : 'PENDING',
          attempts,
          error: message.slice(0, 1000),
        },
      });
      logger.error({ error, emailId: email.id }, 'Gagal mengirim email');
    }
    processed += 1;
  }
  return processed;
}
