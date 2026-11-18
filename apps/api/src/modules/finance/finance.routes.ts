import { Router } from 'express';
import { requireAuth, requireAdmin, requireActiveOrganizer, requireReauth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/response';
import {
  dashboardAnalytics,
  financialOverview,
  eventFinancialReports,
  listLedger,
} from './analytics.service';
import {
  addBank,
  listBanks,
  removeBank,
  getPayout,
  listPayouts,
  requestPayout,
  reviewPayout,
} from './payout.service';
import { listRefunds, requestRefund, reviewRefund, simulateRefund } from './refund.service';
import {
  bankSchema,
  payoutSchema,
  payoutReviewSchema,
  refundSchema,
  refundReviewSchema,
  periodSchema,
  listQuerySchema,
  ledgerQuerySchema,
  type PeriodQuery,
  type ListQuery,
} from './finance.schemas';

export const adminFinanceRouter = Router();
adminFinanceRouter.use(requireAuth, requireAdmin);
export const creatorFinanceRouter = Router();
creatorFinanceRouter.use(requireAuth, requireActiveOrganizer);

for (const [router, own] of [
  [adminFinanceRouter, false],
  [creatorFinanceRouter, true],
] as const) {
  router.get('/ledger', validate(ledgerQuerySchema, 'query'), async (req, res) => {
    const result = await listLedger(
      req.query as unknown as ListQuery,
      own ? req.auth!.organizerId! : undefined,
    );
    return ok(res, result.data, result.meta);
  });
  router.get('/analytics', validate(periodSchema, 'query'), async (req, res) =>
    ok(
      res,
      await dashboardAnalytics(
        req.query as unknown as PeriodQuery,
        own ? req.auth!.organizerId! : undefined,
      ),
    ),
  );
  router.get('/financial-overview', validate(periodSchema, 'query'), async (req, res) =>
    ok(
      res,
      await financialOverview(
        req.query as unknown as PeriodQuery,
        own ? req.auth!.organizerId! : undefined,
      ),
    ),
  );
  router.get('/event-reports', validate(listQuerySchema, 'query'), async (req, res) => {
    const result = await eventFinancialReports(
      req.query as unknown as ListQuery,
      own ? req.auth!.organizerId! : undefined,
    );
    return ok(res, result.data, result.meta);
  });
  router.get('/event-reports/:id', async (req, res) => {
    const result = await eventFinancialReports(
      { page: 1, limit: 1, eventId: req.params.id! },
      own ? req.auth!.organizerId! : undefined,
    );
    return ok(res, { report: result.data[0] });
  });
  router.get('/payouts', validate(listQuerySchema, 'query'), async (req, res) => {
    const result = await listPayouts(
      req.query as unknown as ListQuery,
      own ? req.auth!.organizerId! : undefined,
    );
    return ok(res, result.data, result.meta);
  });
  router.get('/payouts/:id', async (req, res) =>
    ok(res, { payout: await getPayout(req.params.id!, own ? req.auth!.organizerId! : undefined) }),
  );
  router.get('/refunds', validate(listQuerySchema, 'query'), async (req, res) => {
    const result = await listRefunds(
      req.query as unknown as ListQuery,
      own ? req.auth!.organizerId! : undefined,
    );
    return ok(res, result.data, result.meta);
  });
}
creatorFinanceRouter.get('/bank-accounts', async (req, res) =>
  ok(res, { accounts: await listBanks(req.auth!.organizerId!) }),
);
creatorFinanceRouter.post('/bank-accounts', requireReauth, validate(bankSchema), async (req, res) =>
  created(res, { account: await addBank(req.auth!.organizerId!, req.body, req) }),
);
creatorFinanceRouter.delete('/bank-accounts/:id', requireReauth, async (req, res) =>
  ok(res, await removeBank(req.auth!.organizerId!, req.params.id!, req)),
);
creatorFinanceRouter.post('/payouts', validate(payoutSchema), async (req, res) =>
  created(res, { payout: await requestPayout(req.auth!.organizerId!, req.body, req) }),
);
adminFinanceRouter.patch('/payouts/:id/review', requireReauth, validate(payoutReviewSchema), async (req, res) =>
  ok(res, { payout: await reviewPayout(req.params.id!, req.body, req) }),
);
adminFinanceRouter.post('/refunds', validate(refundSchema), async (req, res) =>
  created(res, { refund: await requestRefund(req.body, req) }),
);
adminFinanceRouter.patch('/refunds/:id/review', validate(refundReviewSchema), async (req, res) =>
  ok(res, { refund: await reviewRefund(req.params.id!, req.body, req) }),
);
adminFinanceRouter.post('/refunds/:id/simulate', async (req, res) =>
  ok(res, {
    refund: await simulateRefund(req.params.id!, req),
    message: 'Simulasi internal; tidak ada transfer eksternal.',
  }),
);

export const customerRefundRouter = Router();
customerRefundRouter.use(requireAuth);
customerRefundRouter.post('/', validate(refundSchema), async (req, res) =>
  created(res, { refund: await requestRefund(req.body, req) }),
);
