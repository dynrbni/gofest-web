import { Router } from 'express';
import { scanTicketSchema } from '@gofest/shared';
import { requireAuth } from '../../middleware/auth';
import { checkInLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import { ok } from '../../lib/response';
import {
  getStaffCheckInSummary,
  listStaffEvents,
  scanTicket,
} from './check-in.service';

export const staffRouter = Router();

staffRouter.use(requireAuth);

staffRouter.get('/events', async (req, res) => {
  const events = await listStaffEvents(req.auth!.userId);
  return ok(res, { events });
});

export const checkInRouter = Router();

checkInRouter.use(requireAuth);

checkInRouter.post(
  '/scan',
  checkInLimiter,
  validate(scanTicketSchema),
  async (req, res) => {
    const result = await scanTicket(req.body, req.auth!.userId, req);
    return ok(res, result);
  },
);

checkInRouter.get('/events/:eventId/summary', async (req, res) => {
  const summary = await getStaffCheckInSummary(req.params.eventId!, req.auth!.userId);
  return ok(res, summary);
});
