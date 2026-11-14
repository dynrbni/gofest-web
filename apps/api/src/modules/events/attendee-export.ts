import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';

function cell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export async function exportAttendees(req: Request, res: Response) {
  const event = await prisma.event.findUnique({
    where: { id: req.params.eventId! },
    select: { id: true, organizerId: true, title: true, slug: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== req.auth!.organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }

  const tickets = await prisma.ticket.findMany({
    where: { eventId: event.id },
    orderBy: { issuedAt: 'asc' },
    select: {
      ticketCode: true,
      holderName: true,
      holderEmail: true,
      status: true,
      issuedAt: true,
      checkedInAt: true,
      order: { select: { orderCode: true, buyerName: true, buyerPhone: true } },
      ticketType: { select: { name: true, price: true } },
    },
  });

  const header = [
    'kode_tiket',
    'nama_pemegang',
    'email_pemegang',
    'telepon_pembeli',
    'tipe_tiket',
    'harga',
    'status_tiket',
    'kode_order',
    'nama_pembeli',
    'waktu_terbit',
    'waktu_check_in',
  ];
  const lines = [header.map(cell).join(',')];
  for (const ticket of tickets) {
    lines.push(
      [
        ticket.ticketCode,
        ticket.holderName,
        ticket.holderEmail,
        ticket.order.buyerPhone,
        ticket.ticketType.name,
        ticket.ticketType.price,
        ticket.status,
        ticket.order.orderCode,
        ticket.order.buyerName,
        ticket.issuedAt.toISOString(),
        ticket.checkedInAt?.toISOString() ?? '',
      ]
        .map(cell)
        .join(','),
    );
  }

  await writeAudit({
    actorUserId: req.auth!.userId,
    action: 'ATTENDEES_EXPORTED',
    resourceType: 'EVENT',
    resourceId: event.id,
    metadata: { ticketCount: tickets.length },
    req,
  });

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${event.slug}-attendees-${date}.csv"`,
  );
  res.setHeader('Cache-Control', 'no-store');
  return res.send(`\uFEFF${lines.join('\r\n')}\r\n`);
}
