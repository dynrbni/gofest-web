import { Router } from 'express';
import {
  couponInputSchema,
  couponUpdateSchema,
  eventCancelSchema,
  eventInputSchema,
  eventListQuerySchema,
  eventManageQuerySchema,
  eventUpdateSchema,
  addStaffSchema,
  orderListQuerySchema,
  ticketTypeInputSchema,
  ticketTypeUpdateSchema,
  type EventListQuery,
  type EventManageQuery,
} from '@gofest/shared';
import { validate } from '../../middleware/validate';
import { requireAuth, requireActiveOrganizer } from '../../middleware/auth';
import { created, ok } from '../../lib/response';
import {
  cancelOwnEvent,
  createEvent,
  deleteEvent,
  getOwnedEvent,
  getPublicEvent,
  listOrganizerEvents,
  listPublicEvents,
  listPublicTicketTypes,
  submitEvent,
  updateEvent,
} from './event.service';
import {
  createTicketType,
  deactivateTicketType,
  listTicketTypes,
  updateTicketType,
} from './ticket-type.service';
import {
  createCoupon,
  deactivateCoupon,
  listCoupons,
  updateCoupon,
} from './coupon.service';
import { addStaff, listStaff, removeStaff } from './staff.service';
import { getOrganizerDashboard } from '../dashboard/dashboard.service';
import { exportAttendees } from './attendee-export';
import { listEventOrders } from '../orders/order.service';

export const publicEventRouter = Router();

publicEventRouter.get('/', validate(eventListQuerySchema, 'query'), async (req, res) => {
  const result = await listPublicEvents(req.query as unknown as EventListQuery);
  return ok(res, result.data, result.meta);
});

publicEventRouter.get('/:slug/ticket-types', async (req, res) => {
  const result = await listPublicTicketTypes(req.params.slug!);
  return ok(res, result);
});

publicEventRouter.get('/:slug', async (req, res) => {
  const event = await getPublicEvent(req.params.slug!);
  return ok(res, { event });
});

export const organizerWorkspaceRouter = Router();

organizerWorkspaceRouter.use(requireAuth, requireActiveOrganizer);

organizerWorkspaceRouter.get('/dashboard', async (req, res) => {
  const dashboard = await getOrganizerDashboard(req.auth!.organizerId!);
  return ok(res, dashboard);
});

organizerWorkspaceRouter.get(
  '/events',
  validate(eventManageQuerySchema, 'query'),
  async (req, res) => {
    const result = await listOrganizerEvents(
      req.auth!.organizerId!,
      req.query as unknown as EventManageQuery,
    );
    return ok(res, result.data, result.meta);
  },
);

organizerWorkspaceRouter.post('/events', validate(eventInputSchema), async (req, res) => {
  const event = await createEvent(req.auth!.organizerId!, req.body, req);
  return created(res, { event });
});

organizerWorkspaceRouter.get('/events/:id', async (req, res) => {
  const event = await getOwnedEvent(req.params.id!, req.auth!.organizerId!);
  return ok(res, { event });
});

organizerWorkspaceRouter.patch(
  '/events/:id',
  validate(eventUpdateSchema),
  async (req, res) => {
    const event = await updateEvent(req.params.id!, req.auth!.organizerId!, req.body, req);
    return ok(res, { event });
  },
);

organizerWorkspaceRouter.delete('/events/:id', async (req, res) => {
  const result = await deleteEvent(req.params.id!, req.auth!.organizerId!, req);
  return ok(res, result);
});

organizerWorkspaceRouter.post('/events/:id/submit', async (req, res) => {
  const event = await submitEvent(req.params.id!, req.auth!.organizerId!, req);
  return ok(res, { event });
});

organizerWorkspaceRouter.post(
  '/events/:id/cancel',
  validate(eventCancelSchema),
  async (req, res) => {
    const result = await cancelOwnEvent(
      req.params.id!,
      req.auth!.organizerId!,
      req.body.reason,
      req,
    );
    return ok(res, result);
  },
);

organizerWorkspaceRouter.get('/events/:eventId/ticket-types', async (req, res) => {
  const ticketTypes = await listTicketTypes(req.params.eventId!, req.auth!.organizerId!);
  return ok(res, { ticketTypes });
});

organizerWorkspaceRouter.post(
  '/events/:eventId/ticket-types',
  validate(ticketTypeInputSchema),
  async (req, res) => {
    const ticketType = await createTicketType(
      req.params.eventId!,
      req.auth!.organizerId!,
      req.body,
      req,
    );
    return created(res, { ticketType });
  },
);

organizerWorkspaceRouter.patch(
  '/ticket-types/:id',
  validate(ticketTypeUpdateSchema),
  async (req, res) => {
    const ticketType = await updateTicketType(
      req.params.id!,
      req.auth!.organizerId!,
      req.body,
      req,
    );
    return ok(res, { ticketType });
  },
);

organizerWorkspaceRouter.delete('/ticket-types/:id', async (req, res) => {
  const ticketType = await deactivateTicketType(req.params.id!, req.auth!.organizerId!, req);
  return ok(res, { ticketType });
});

organizerWorkspaceRouter.get('/events/:eventId/coupons', async (req, res) => {
  const coupons = await listCoupons(req.params.eventId!, req.auth!.organizerId!);
  return ok(res, { coupons });
});

organizerWorkspaceRouter.post(
  '/events/:eventId/coupons',
  validate(couponInputSchema),
  async (req, res) => {
    const coupon = await createCoupon(
      req.params.eventId!,
      req.auth!.organizerId!,
      req.body,
      req,
    );
    return created(res, { coupon });
  },
);

organizerWorkspaceRouter.patch(
  '/coupons/:id',
  validate(couponUpdateSchema),
  async (req, res) => {
    const coupon = await updateCoupon(req.params.id!, req.auth!.organizerId!, req.body, req);
    return ok(res, { coupon });
  },
);

organizerWorkspaceRouter.delete('/coupons/:id', async (req, res) => {
  const coupon = await deactivateCoupon(req.params.id!, req.auth!.organizerId!, req);
  return ok(res, { coupon });
});

organizerWorkspaceRouter.get('/events/:eventId/staff', async (req, res) => {
  const staff = await listStaff(req.params.eventId!, req.auth!.organizerId!);
  return ok(res, { staff });
});

organizerWorkspaceRouter.post(
  '/events/:eventId/staff',
  validate(addStaffSchema),
  async (req, res) => {
    const staff = await addStaff(
      req.params.eventId!,
      req.auth!.organizerId!,
      req.body,
      req,
    );
    return created(res, { staff });
  },
);

organizerWorkspaceRouter.delete('/events/:eventId/staff/:staffId', async (req, res) => {
  const result = await removeStaff(
    req.params.eventId!,
    req.auth!.organizerId!,
    req.params.staffId!,
    req,
  );
  return ok(res, result);
});

organizerWorkspaceRouter.get('/events/:eventId/attendees/export', async (req, res) => {
  await exportAttendees(req, res);
});

organizerWorkspaceRouter.get(
  '/events/:eventId/orders',
  validate(orderListQuerySchema, 'query'),
  async (req, res) => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      status?: string;
    };
    const result = await listEventOrders(
      req.params.eventId!,
      req.auth!.organizerId!,
      query,
    );
    return ok(res, result.data, result.meta);
  },
);
