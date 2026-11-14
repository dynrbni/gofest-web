import { Router } from 'express';
import {
  adminAuditQuerySchema,
  adminOrganizerQuerySchema,
  adminUserQuerySchema,
  categoryInputSchema,
  categoryUpdateSchema,
  eventManageQuerySchema,
  eventReviewSchema,
  orderListQuerySchema,
  organizerReviewSchema,
  paymentReviewResolveSchema,
  platformSettingsSchema,
  userStatusInputSchema,
  type AdminAuditQuery,
  type AdminOrganizerQuery,
  type AdminUserQuery,
  type EventManageQuery,
  type OrderListQuery,
} from '@gofest/shared';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/response';
import {
  getAdminDashboard,
  getAdminEvent,
  getAdminOrder,
  getAdminOrganizer,
  getAdminUser,
  listAdminEvents,
  listAdminOrders,
  listAdminOrganizers,
  listAdminUsers,
  listAuditLogs,
  resolvePaymentReview,
  reviewEvent,
  reviewOrganizer,
  updateUserStatus,
} from './admin.service';
import {
  createCategory,
  listAllCategories,
  updateCategory,
} from '../categories/category.service';
import { getPlatformSettings, updatePlatformSettings } from '../settings/settings.service';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/dashboard', async (_req, res) => {
  const dashboard = await getAdminDashboard();
  return ok(res, dashboard);
});

adminRouter.get('/users', validate(adminUserQuerySchema, 'query'), async (req, res) => {
  const result = await listAdminUsers(req.query as unknown as AdminUserQuery);
  return ok(res, result.data, result.meta);
});

adminRouter.get('/users/:id', async (req, res) => {
  const user = await getAdminUser(req.params.id!);
  return ok(res, { user });
});

adminRouter.patch(
  '/users/:id/status',
  validate(userStatusInputSchema),
  async (req, res) => {
    const user = await updateUserStatus(
      req.params.id!,
      req.body,
      req.auth!.userId,
      req,
    );
    return ok(res, { user });
  },
);

adminRouter.get(
  '/organizers',
  validate(adminOrganizerQuerySchema, 'query'),
  async (req, res) => {
    const result = await listAdminOrganizers(req.query as unknown as AdminOrganizerQuery);
    return ok(res, result.data, result.meta);
  },
);

adminRouter.get('/organizers/:id', async (req, res) => {
  const organizer = await getAdminOrganizer(req.params.id!);
  return ok(res, { organizer });
});

adminRouter.patch(
  '/organizers/:id/status',
  validate(organizerReviewSchema),
  async (req, res) => {
    const organizer = await reviewOrganizer(
      req.params.id!,
      req.body,
      req.auth!.userId,
      req,
    );
    return ok(res, { organizer });
  },
);

adminRouter.get('/events', validate(eventManageQuerySchema, 'query'), async (req, res) => {
  const result = await listAdminEvents(req.query as unknown as EventManageQuery);
  return ok(res, result.data, result.meta);
});

adminRouter.get('/events/:id', async (req, res) => {
  const event = await getAdminEvent(req.params.id!);
  return ok(res, { event });
});

adminRouter.patch(
  '/events/:id/review',
  validate(eventReviewSchema),
  async (req, res) => {
    const event = await reviewEvent(
      req.params.id!,
      req.body,
      req.auth!.userId,
      req,
    );
    return ok(res, { event });
  },
);

adminRouter.get('/orders', validate(orderListQuerySchema, 'query'), async (req, res) => {
  const result = await listAdminOrders(req.query as unknown as OrderListQuery);
  return ok(res, result.data, result.meta);
});

adminRouter.get('/orders/:id', async (req, res) => {
  const order = await getAdminOrder(req.params.id!);
  return ok(res, { order });
});

adminRouter.post(
  '/orders/:id/payment-review/resolve',
  validate(paymentReviewResolveSchema),
  async (req, res) => {
    const result = await resolvePaymentReview(
      req.params.id!,
      req.body,
      req.auth!.userId,
      req,
    );
    return ok(res, result);
  },
);

adminRouter.get('/categories', async (_req, res) => {
  const categories = await listAllCategories();
  return ok(res, { categories });
});

adminRouter.post('/categories', validate(categoryInputSchema), async (req, res) => {
  const category = await createCategory(req.body, req);
  return created(res, { category });
});

adminRouter.patch('/categories/:id', validate(categoryUpdateSchema), async (req, res) => {
  const category = await updateCategory(req.params.id!, req.body, req);
  return ok(res, { category });
});

adminRouter.get('/settings', async (_req, res) => {
  const settings = await getPlatformSettings();
  return ok(res, { settings });
});

adminRouter.patch('/settings', validate(platformSettingsSchema), async (req, res) => {
  const settings = await updatePlatformSettings(req.body, req);
  return ok(res, { settings });
});

adminRouter.get('/audit-logs', validate(adminAuditQuerySchema, 'query'), async (req, res) => {
  const result = await listAuditLogs(req.query as unknown as AdminAuditQuery);
  return ok(res, result.data, result.meta);
});
