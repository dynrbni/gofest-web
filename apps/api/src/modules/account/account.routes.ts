import { Router } from 'express';
import {
  accountHistoryQuerySchema,
  accountTicketQuerySchema,
  type AccountHistoryQuery,
  type AccountTicketQuery,
} from '@gofest/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../lib/response';
import {
  getAccountDashboard,
  getAccountRecommendations,
  listAccountHistory,
  listAccountTickets,
  getAccountTicket,
} from './account.service';

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/dashboard', async (req, res) =>
  ok(res, await getAccountDashboard(req.auth!.userId)),
);
accountRouter.get('/tickets', validate(accountTicketQuerySchema, 'query'), async (req, res) => {
  const result = await listAccountTickets(
    req.auth!.userId,
    req.query as unknown as AccountTicketQuery,
  );
  return ok(res, result.data, result.meta);
});
accountRouter.get('/history', validate(accountHistoryQuerySchema, 'query'), async (req, res) => {
  const result = await listAccountHistory(
    req.auth!.userId,
    req.query as unknown as AccountHistoryQuery,
  );
  return ok(res, result.data, result.meta);
});
accountRouter.get('/recommendations', async (_req, res) =>
  ok(res, await getAccountRecommendations()),
);
accountRouter.get('/tickets/:ticketCode', async (req, res) =>
  ok(res, await getAccountTicket(req.params.ticketCode!, req)),
);
