import { Router } from 'express';
import {
  addStaffSchema,
  orderListQuerySchema,
  type OrderListQuery,
  eventUpdateSchema,
} from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import {
  requireAuth,
  requireAdmin,
  requireActiveOrganizer,
  requireSuperadmin,
} from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok, created } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';
import { listQuerySchema, type ListQuery } from '../finance/finance.schemas';
import { listAdminOrders, getAdminOrder } from '../admin/admin.service';
import {
  createAdminSchema,
  updateAdminSchema,
  resetAdminSchema,
  createAdmin,
  listAdmins,
  getAdmin,
  updateAdmin,
  resetAdminPassword,
  listPermissions,
  permissionSchema,
  updatePermission,
} from '../admin/admin-management.service';
import {
  contentSchema,
  listContent,
  saveContent,
  deleteContent,
  supportSchema,
  supportReplySchema,
  listSupport,
  createSupport,
  replySupport,
  checkInMonitoring,
  listAttendees,
} from './workspace.service';
import { addStaff, removeStaff } from '../events/staff.service';
import { updateEvent } from '../events/event.service';

export const adminWorkspaceRouter = Router();
adminWorkspaceRouter.use(requireAuth, requireAdmin);
export const creatorWorkspaceRouter = Router();
creatorWorkspaceRouter.use(requireAuth, requireActiveOrganizer);

adminWorkspaceRouter.get(
  '/admins',
  requireSuperadmin,
  validate(listQuerySchema, 'query'),
  async (req, res) => {
    const result = await listAdmins(req.query as unknown as ListQuery);
    return ok(res, result.data, result.meta);
  },
);
adminWorkspaceRouter.get('/admins/:id', requireSuperadmin, async (req, res) =>
  ok(res, { admin: await getAdmin(req.params.id!) }),
);
adminWorkspaceRouter.post(
  '/admins',
  requireSuperadmin,
  validate(createAdminSchema),
  async (req, res) => created(res, { admin: await createAdmin(req.body, req) }),
);
adminWorkspaceRouter.patch(
  '/admins/:id',
  requireSuperadmin,
  validate(updateAdminSchema),
  async (req, res) => ok(res, { admin: await updateAdmin(req.params.id!, req.body, req) }),
);
adminWorkspaceRouter.post(
  '/admins/:id/reset-password',
  requireSuperadmin,
  validate(resetAdminSchema),
  async (req, res) => ok(res, await resetAdminPassword(req.params.id!, req.body.password, req)),
);
adminWorkspaceRouter.get('/permissions', requireSuperadmin, async (_req, res) =>
  ok(res, { permissions: await listPermissions() }),
);
adminWorkspaceRouter.patch(
  '/permissions',
  requireSuperadmin,
  validate(permissionSchema),
  async (req, res) => ok(res, { permission: await updatePermission(req.body, req) }),
);
adminWorkspaceRouter.get('/content', validate(listQuerySchema, 'query'), async (req, res) => {
  const result = await listContent(
    req.query as unknown as ListQuery,
    typeof req.query.kind === 'string' ? req.query.kind : undefined,
  );
  return ok(res, result.data, result.meta);
});
adminWorkspaceRouter.post('/content', validate(contentSchema), async (req, res) =>
  created(res, { item: await saveContent(undefined, req.body, req) }),
);
adminWorkspaceRouter.patch('/content/:id', validate(contentSchema), async (req, res) =>
  ok(res, { item: await saveContent(req.params.id!, req.body, req) }),
);
adminWorkspaceRouter.delete('/content/:id', async (req, res) =>
  ok(res, await deleteContent(req.params.id!, req)),
);
adminWorkspaceRouter.patch('/events/:id', validate(eventUpdateSchema), async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id! },
    select: { organizerId: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan');
  return ok(res, { event: await updateEvent(req.params.id!, event.organizerId, req.body, req) });
});
adminWorkspaceRouter.patch('/support/:id', validate(supportReplySchema), async (req, res) =>
  ok(res, { ticket: await replySupport(req.params.id!, req.body, req) }),
);
creatorWorkspaceRouter.get('/orders', validate(orderListQuerySchema, 'query'), async (req, res) => {
  const result = await listAdminOrders({
    ...(req.query as unknown as OrderListQuery),
    organizerId: req.auth!.organizerId!,
  });
  return ok(res, result.data, result.meta);
});
creatorWorkspaceRouter.get('/orders/:id', async (req, res) => {
  if (
    !(await prisma.order.findFirst({
      where: { id: req.params.id!, event: { organizerId: req.auth!.organizerId! } },
      select: { id: true },
    }))
  )
    throw new NotFoundError('Order tidak ditemukan');
  return ok(res, { order: await getAdminOrder(req.params.id!) });
});
for (const [router, own] of [
  [adminWorkspaceRouter, false],
  [creatorWorkspaceRouter, true],
] as const) {
  router.get('/check-in-monitoring', validate(listQuerySchema, 'query'), async (req, res) =>
    ok(
      res,
      await checkInMonitoring(
        req.query as unknown as ListQuery,
        own ? req.auth!.organizerId! : undefined,
      ),
    ),
  );
  router.get('/attendees', validate(listQuerySchema, 'query'), async (req, res) => {
    const result = await listAttendees(
      req.query as unknown as ListQuery,
      own ? req.auth!.organizerId! : undefined,
    );
    return ok(res, result.data, result.meta);
  });
  router.post('/staff/:eventId', validate(addStaffSchema), async (req, res) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId!, ...(own ? { organizerId: req.auth!.organizerId! } : {}) },
      select: { organizerId: true },
    });
    if (!event) throw new NotFoundError('Event tidak ditemukan');
    return created(res, {
      staff: await addStaff(req.params.eventId!, event.organizerId, req.body, req),
    });
  });
  router.delete('/staff/:eventId/:id', async (req, res) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId!, ...(own ? { organizerId: req.auth!.organizerId! } : {}) },
      select: { organizerId: true },
    });
    if (!event) throw new NotFoundError();
    return ok(res, await removeStaff(req.params.eventId!, event.organizerId, req.params.id!, req));
  });
  router.get('/support', validate(listQuerySchema, 'query'), async (req, res) => {
    const result = await listSupport(
      req.query as unknown as ListQuery,
      own ? req.auth!.userId : undefined,
    );
    return ok(res, result.data, result.meta);
  });
  router.post('/support', validate(supportSchema), async (req, res) =>
    created(res, { ticket: await createSupport(req.body, req) }),
  );
  router.get('/notifications', validate(listQuerySchema, 'query'), async (req, res) => {
    const query = req.query as unknown as ListQuery;
    const [data, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      }),
      prisma.notification.count({ where: { userId: req.auth!.userId } }),
      prisma.notification.count({ where: { userId: req.auth!.userId, readAt: null } }),
    ]);
    const meta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
    return ok(res, { notifications: data, unread, meta }, meta);
  });
  router.patch('/notifications/:id/read', async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id!, userId: req.auth!.userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundError();
    return ok(res, { read: true });
  });
  router.get('/events/:id/history', async (req, res) => {
    if (
      !(await prisma.event.findFirst({
        where: { id: req.params.id!, ...(own ? { organizerId: req.auth!.organizerId! } : {}) },
        select: { id: true },
      }))
    )
      throw new NotFoundError();
    return ok(res, {
      history: await prisma.auditLog.findMany({
        where: { resourceType: 'EVENT', resourceId: req.params.id! },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      }),
    });
  });
}
