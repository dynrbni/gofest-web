import type { Prisma } from '@prisma/client';

export async function notifyUser(
  tx: Prisma.TransactionClient,
  input: { userId: string; title: string; message: string; href?: string },
) {
  const setting = await tx.platformSetting.findUnique({ where: { key: 'notifications_enabled' } });
  if (setting?.value === false) return;
  await tx.notification.create({ data: input });
}
export async function notifyAdmins(
  tx: Prisma.TransactionClient,
  input: { title: string; message: string; href: string },
) {
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
