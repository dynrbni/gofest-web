import { Router } from 'express';
import { BadRequestError } from '../../lib/errors';
import { ok } from '../../lib/response';
import { handlePayoutWebhook } from '../finance/payout-transfer.service';
import { handlePaymentWebhook } from '../orders/order.service';

export const webhookRouter = Router();

webhookRouter.post('/payments/:provider', async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    throw new BadRequestError('Webhook harus dikirim sebagai raw JSON');
  }
  const result = await handlePaymentWebhook(req.params.provider!, req.headers, req.body);
  return ok(res, result);
});

webhookRouter.post('/payouts/xendit', async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    throw new BadRequestError('Webhook harus dikirim sebagai raw JSON');
  }
  return ok(res, await handlePayoutWebhook({ headers: req.headers, rawBody: req.body }));
});
