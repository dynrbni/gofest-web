import { Router } from 'express';
import {
  ticketTypeInputSchema,
  ticketTypeUpdateSchema,
  couponInputSchema,
  couponUpdateSchema,
  addStaffSchema,
  orderListQuerySchema,
  ticketListQuerySchema,
  eventCancelSchema,
  type OrderListQuery,
  type TicketListQuery,
} from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';
import {
  createTicketType,
  listTicketTypes,
  updateTicketType,
  deactivateTicketType,
} from '../events/ticket-type.service';
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  deactivateCoupon,
} from '../events/coupon.service';
import { addStaff, listStaff, removeStaff } from '../events/staff.service';
import { getOrganizerCheckInSummary } from '../check-in/check-in.service';
import { listEventOrders } from '../orders/order.service';
import { listEventTickets } from '../tickets/ticket.service';
import { cancelEventAsAdmin } from '../events/event.service';
import { exportAttendees } from '../events/attendee-export';

export const adminEventRouter = Router();
adminEventRouter.use(requireAuth, requireAdmin);
adminEventRouter.get('/events/:eventId/attendees/export', async (req, res) => {
  await exportAttendees(req, res);
});
async function eventOwner(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, select: { organizerId: true } });
  if (!event) throw new NotFoundError('Event tidak ditemukan');
  return event.organizerId;
}
async function resourceOwner(id: string, kind: 'ticket' | 'coupon') {
  const resource =
    kind === 'ticket'
      ? await prisma.ticketType.findUnique({ where: { id }, select: { eventId: true } })
      : await prisma.coupon.findUnique({ where: { id }, select: { eventId: true } });
  if (!resource) throw new NotFoundError();
  return eventOwner(resource.eventId);
}
adminEventRouter.get('/events/:id/ticket-types', async (req, res) =>
  ok(res, { ticketTypes: await listTicketTypes(req.params.id!, await eventOwner(req.params.id!)) }),
);
adminEventRouter.post(
  '/events/:id/ticket-types',
  validate(ticketTypeInputSchema),
  async (req, res) =>
    created(res, {
      ticketType: await createTicketType(
        req.params.id!,
        await eventOwner(req.params.id!),
        req.body,
        req,
      ),
    }),
);
adminEventRouter.patch('/ticket-types/:id', validate(ticketTypeUpdateSchema), async (req, res) =>
  ok(res, {
    ticketType: await updateTicketType(
      req.params.id!,
      await resourceOwner(req.params.id!, 'ticket'),
      req.body,
      req,
    ),
  }),
);
adminEventRouter.delete('/ticket-types/:id', async (req, res) =>
  ok(res, {
    ticketType: await deactivateTicketType(
      req.params.id!,
      await resourceOwner(req.params.id!, 'ticket'),
      req,
    ),
  }),
);
adminEventRouter.get('/events/:id/coupons', async (req, res) =>
  ok(res, { coupons: await listCoupons(req.params.id!, await eventOwner(req.params.id!)) }),
);
adminEventRouter.post('/events/:id/coupons', validate(couponInputSchema), async (req, res) =>
  created(res, {
    coupon: await createCoupon(req.params.id!, await eventOwner(req.params.id!), req.body, req),
  }),
);
adminEventRouter.patch('/coupons/:id', validate(couponUpdateSchema), async (req, res) =>
  ok(res, {
    coupon: await updateCoupon(
      req.params.id!,
      await resourceOwner(req.params.id!, 'coupon'),
      req.body,
      req,
    ),
  }),
);
adminEventRouter.delete('/coupons/:id', async (req, res) =>
  ok(res, {
    coupon: await deactivateCoupon(
      req.params.id!,
      await resourceOwner(req.params.id!, 'coupon'),
      req,
    ),
  }),
);
adminEventRouter.get('/events/:id/staff', async (req, res) =>
  ok(res, { staff: await listStaff(req.params.id!, await eventOwner(req.params.id!)) }),
);
adminEventRouter.post('/events/:id/staff', validate(addStaffSchema), async (req, res) =>
  created(res, {
    staff: await addStaff(req.params.id!, await eventOwner(req.params.id!), req.body, req),
  }),
);
adminEventRouter.delete('/events/:id/staff/:staffId', async (req, res) =>
  ok(
    res,
    await removeStaff(req.params.id!, await eventOwner(req.params.id!), req.params.staffId!, req),
  ),
);
adminEventRouter.get('/events/:id/check-in/summary', async (req, res) =>
  ok(res, await getOrganizerCheckInSummary(req.params.id!, await eventOwner(req.params.id!))),
);
adminEventRouter.get(
  '/events/:id/orders',
  validate(orderListQuerySchema, 'query'),
  async (req, res) => {
    const result = await listEventOrders(
      req.params.id!,
      await eventOwner(req.params.id!),
      req.query as unknown as OrderListQuery,
    );
    return ok(res, result.data, result.meta);
  },
);
adminEventRouter.get(
  '/events/:id/tickets',
  validate(ticketListQuerySchema, 'query'),
  async (req, res) => {
    const result = await listEventTickets(
      req.params.id!,
      await eventOwner(req.params.id!),
      req.query as unknown as TicketListQuery,
    );
    return ok(res, result.data, result.meta);
  },
);
adminEventRouter.post('/events/:id/cancel', validate(eventCancelSchema), async (req, res) =>
  ok(res, await cancelEventAsAdmin(req.params.id!, req.body.reason, req)),
);
