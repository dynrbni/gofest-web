import type { Prisma } from '@prisma/client';

export const notificationCategories = [
  'GENERAL',
  'EVENT_REVIEW',
  'EVENT',
  'ORDER',
  'REFUND',
  'SUPPORT',
  'PAYOUT',
  'ORGANIZER',
  'CHECK_IN',
] as const;
export type NotificationCategory = (typeof notificationCategories)[number];

interface NoticeInput {
  title: string;
  message: string;
  href?: string;
  category?: NotificationCategory;
}

export async function notifyUser(
  tx: Prisma.TransactionClient,
  input: NoticeInput & { userId: string },
) {
  const setting = await tx.platformSetting.findUnique({ where: { key: 'notifications_enabled' } });
  if (setting?.value === false) return;
  await tx.notification.create({ data: input });
}
export async function notifyAdmins(tx: Prisma.TransactionClient, input: NoticeInput) {
  const setting = await tx.platformSetting.findUnique({ where: { key: 'notifications_enabled' } });
  if (setting?.value === false) return;
  const admins = await tx.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (admins.length)
    await tx.notification.createMany({
      data: admins.map((admin) => ({ ...input, userId: admin.id })),
    });
}
