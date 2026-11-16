import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { ok } from '../../lib/response';
import { ServiceUnavailableError } from '../../lib/errors';
import { authRouter } from '../../modules/auth/auth.routes';
import { publicEventRouter, organizerWorkspaceRouter } from '../../modules/events/event.routes';
import { publicOrganizerRouter, organizerRouter } from '../../modules/organizers/organizer.routes';
import { categoryRouter } from '../../modules/categories/category.routes';
import { uploadRouter } from '../../modules/uploads/upload.routes';
import { orderRouter, accountOrderRouter } from '../../modules/orders/order.routes';
import { webhookRouter } from '../../modules/payments/webhook.routes';
import { checkInRouter, staffRouter } from '../../modules/check-in/check-in.routes';
import { adminRouter } from '../../modules/admin/admin.routes';
import { ticketRouter } from '../../modules/tickets/ticket.routes';
import { accountRouter } from '../../modules/account/account.routes';
import { getPlatformSettings } from '../../modules/settings/settings.service';
import {
  adminFinanceRouter,
  creatorFinanceRouter,
  customerRefundRouter,
} from '../../modules/finance/finance.routes';
import {
  adminWorkspaceRouter,
  creatorWorkspaceRouter,
} from '../../modules/workspace/workspace.routes';
import { adminEventRouter } from '../../modules/admin/admin-event.routes';
import { cmsAdminRouter, cmsPublicRouter } from '../../modules/cms/cms.routes';

export const v1Router = Router();

v1Router.get('/', (_req, res) => {
  return ok(res, {
    name: 'Gofest API',
    version: 'v1',
    documentation: '/api/docs',
  });
});

v1Router.use('/auth', authRouter);
v1Router.use('/admin/cms', cmsAdminRouter);
v1Router.use('/cms', cmsPublicRouter);
v1Router.use('/admin', adminFinanceRouter, adminWorkspaceRouter, adminEventRouter);
v1Router.use('/creator', creatorFinanceRouter, creatorWorkspaceRouter, organizerWorkspaceRouter);
v1Router.use('/account/refunds', customerRefundRouter);
v1Router.get('/content', async (_req, res) =>
  ok(res, {
    items: await prisma.contentItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 50,
    }),
  }),
);
v1Router.use('/events', publicEventRouter);
v1Router.use('/categories', categoryRouter);
v1Router.use('/organizers', publicOrganizerRouter);
v1Router.use('/organizer/account', organizerRouter);
v1Router.use('/organizer', creatorFinanceRouter, creatorWorkspaceRouter);
v1Router.use('/organizer', organizerWorkspaceRouter);
v1Router.use('/uploads', uploadRouter);
v1Router.use('/orders', orderRouter);
v1Router.use('/tickets', ticketRouter);
v1Router.use('/account/orders', accountOrderRouter);
v1Router.use('/account', accountRouter);
v1Router.use('/webhooks', webhookRouter);
v1Router.use('/staff', staffRouter);
v1Router.use('/check-in', checkInRouter);
v1Router.use('/admin', adminRouter);

v1Router.get('/settings', async (_req, res) => {
  const settings = await getPlatformSettings();
  return ok(res, {
    settings: {
      platformFeeType: settings.platformFeeType,
      platformFeeValue: settings.platformFeeValue,
      orderReservationMinutes: settings.orderReservationMinutes,
      platformName: settings.platformName,
      platformLogo: settings.platformLogo,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
    },
  });
});

v1Router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new ServiceUnavailableError('Database tidak dapat dijangkau');
  }
  return ok(res, {
    status: 'ok',
    service: 'gofest-api',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
});
