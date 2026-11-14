import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';

async function getOwnedEvent(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, status: true, title: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }
  return event;
}

export async function listStaff(eventId: string, organizerId: string) {
  await getOwnedEvent(eventId, organizerId);
  return prisma.eventStaff.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { assignedAt: 'asc' },
  });
}

export async function addStaff(
  eventId: string,
  organizerId: string,
  input: { email: string; role: 'CHECK_IN' | 'MANAGER' },
  req: Request,
) {
  const event = await getOwnedEvent(eventId, organizerId);
  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    throw new ConflictError('Event ini sudah dibatalkan atau selesai', 'EVENT_CLOSED');
  }
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.status !== 'ACTIVE') {
    throw new NotFoundError(
      'Pengguna dengan email tersebut belum terdaftar atau tidak aktif',
      'STAFF_USER_NOT_FOUND',
    );
  }
  const existing = await prisma.eventStaff.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (existing) {
    throw new ConflictError('Pengguna ini sudah menjadi petugas event', 'STAFF_ALREADY_ASSIGNED');
  }

  return prisma.$transaction(async (tx) => {
    const staff = await tx.eventStaff.create({
      data: { eventId, userId: user.id, role: input.role },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'EVENT_STAFF_ADDED',
        resourceType: 'EVENT_STAFF',
        resourceId: staff.id,
        metadata: { eventId, userId: user.id, role: staff.role },
        req,
      },
      tx,
    );
    return staff;
  });
}

export async function removeStaff(eventId: string, organizerId: string, staffId: string, req: Request) {
  await getOwnedEvent(eventId, organizerId);
  const staff = await prisma.eventStaff.findFirst({ where: { id: staffId, eventId } });
  if (!staff) throw new NotFoundError('Petugas tidak ditemukan', 'STAFF_NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.eventStaff.delete({ where: { id: staffId } });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'EVENT_STAFF_REMOVED',
        resourceType: 'EVENT_STAFF',
        resourceId: staffId,
        metadata: { eventId, userId: staff.userId },
        req,
      },
      tx,
    );
  });
  return { removed: true };
}
