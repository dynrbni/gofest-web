import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';

export type TicketTypeInput = {
  name: string;
  description?: string | null;
  price: number;
  quotaTotal: number;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  minPerOrder: number;
  maxPerOrder: number;
  isActive: boolean;
  sortOrder: number;
};

async function getOwnedEvent(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, status: true, title: true, startsAt: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }
  return event;
}

async function getOwnedTicketType(ticketTypeId: string, organizerId: string) {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      event: {
        select: { id: true, organizerId: true, status: true, title: true, startsAt: true },
      },
    },
  });
  if (!ticketType) throw new NotFoundError('Tipe tiket tidak ditemukan', 'TICKET_TYPE_NOT_FOUND');
  if (ticketType.event.organizerId !== organizerId) {
    throw new ForbiddenError('Tipe tiket ini bukan milik organizer kamu', 'TICKET_TYPE_NOT_OWNED');
  }
  return ticketType;
}

function validateSalesWindow(
  eventStartsAt: Date,
  salesStartAt?: string | null,
  salesEndAt?: string | null,
) {
  if (salesStartAt && salesEndAt && new Date(salesEndAt) <= new Date(salesStartAt)) {
    throw new ConflictError(
      'Akhir penjualan harus setelah mulai penjualan',
      'INVALID_SALES_WINDOW',
    );
  }
  if (salesEndAt && new Date(salesEndAt) > eventStartsAt) {
    throw new ConflictError(
      'Penjualan tiket tidak boleh melewati waktu mulai event',
      'SALES_END_AFTER_EVENT',
    );
  }
}

function serialize(ticketType: {
  quotaTotal: number;
  quantitySold: number;
  quantityReserved: number;
}) {
  return {
    ...ticketType,
    available: Math.max(
      0,
      ticketType.quotaTotal - ticketType.quantitySold - ticketType.quantityReserved,
    ),
  };
}

export async function listTicketTypes(eventId: string, organizerId: string) {
  await getOwnedEvent(eventId, organizerId);
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });
  return ticketTypes.map(serialize);
}

export async function createTicketType(
  eventId: string,
  organizerId: string,
  input: TicketTypeInput,
  req: Request,
) {
  const event = await getOwnedEvent(eventId, organizerId);
  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    throw new ConflictError('Event ini sudah dibatalkan atau selesai', 'EVENT_CLOSED');
  }
  validateSalesWindow(event.startsAt, input.salesStartAt, input.salesEndAt);

  return prisma.$transaction(async (tx) => {
    const ticketType = await tx.ticketType.create({
      data: {
        eventId,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        quotaTotal: input.quotaTotal,
        salesStartAt: input.salesStartAt ? new Date(input.salesStartAt) : null,
        salesEndAt: input.salesEndAt ? new Date(input.salesEndAt) : null,
        minPerOrder: input.minPerOrder,
        maxPerOrder: input.maxPerOrder,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'TICKET_TYPE_CREATED',
        resourceType: 'TICKET_TYPE',
        resourceId: ticketType.id,
        metadata: { eventId, name: ticketType.name, price: ticketType.price },
        req,
      },
      tx,
    );
    return serialize(ticketType);
  });
}

export async function updateTicketType(
  ticketTypeId: string,
  organizerId: string,
  input: Partial<TicketTypeInput>,
  req: Request,
) {
  const current = await getOwnedTicketType(ticketTypeId, organizerId);
  if (['CANCELLED', 'COMPLETED'].includes(current.event.status)) {
    throw new ConflictError('Event ini sudah dibatalkan atau selesai', 'EVENT_CLOSED');
  }
  if (
    input.quotaTotal !== undefined &&
    input.quotaTotal < current.quantitySold + current.quantityReserved
  ) {
    throw new ConflictError(
      `Kuota tidak boleh lebih kecil dari tiket terjual dan direservasi (${current.quantitySold + current.quantityReserved})`,
      'QUOTA_BELOW_ALLOCATED',
    );
  }
  validateSalesWindow(
    current.event.startsAt,
    input.salesStartAt !== undefined ? input.salesStartAt : current.salesStartAt?.toISOString(),
    input.salesEndAt !== undefined ? input.salesEndAt : current.salesEndAt?.toISOString(),
  );

  const updated = await prisma.$transaction(async (tx) => {
    const ticketType = await tx.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.quotaTotal !== undefined ? { quotaTotal: input.quotaTotal } : {}),
        ...(input.salesStartAt !== undefined
          ? { salesStartAt: input.salesStartAt ? new Date(input.salesStartAt) : null }
          : {}),
        ...(input.salesEndAt !== undefined
          ? { salesEndAt: input.salesEndAt ? new Date(input.salesEndAt) : null }
          : {}),
        ...(input.minPerOrder !== undefined ? { minPerOrder: input.minPerOrder } : {}),
        ...(input.maxPerOrder !== undefined ? { maxPerOrder: input.maxPerOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'TICKET_TYPE_UPDATED',
        resourceType: 'TICKET_TYPE',
        resourceId: ticketTypeId,
        metadata: { fields: Object.keys(input) },
        req,
      },
      tx,
    );
    return ticketType;
  });

  return serialize(updated);
}

export async function deactivateTicketType(
  ticketTypeId: string,
  organizerId: string,
  req: Request,
) {
  const current = await getOwnedTicketType(ticketTypeId, organizerId);
  const updated = await prisma.$transaction(async (tx) => {
    const ticketType = await tx.ticketType.update({
      where: { id: ticketTypeId },
      data: { isActive: false },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'TICKET_TYPE_DEACTIVATED',
        resourceType: 'TICKET_TYPE',
        resourceId: ticketTypeId,
        metadata: { eventId: current.eventId, name: current.name },
        req,
      },
      tx,
    );
    return ticketType;
  });
  return serialize(updated);
}
