import { Router } from 'express';
import { createOrderSchema, paginationSchema } from '@gofest/shared';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { checkoutLimiter } from '../../middleware/rate-limit';
import { created, ok } from '../../lib/response';
import { readPrivateFile } from '../../lib/storage';
import {
  createOrder,
  createOrderPaymentSession,
  getOrderStatus,
  getOrderTicketQr,
  getOrderTickets,
  listAccountOrders,
  mockPayOrder,
} from './order.service';

export const orderRouter = Router();

orderRouter.post(
  '/',
  optionalAuth,
  checkoutLimiter,
  validate(createOrderSchema),
  async (req, res) => {
    const result = await createOrder(req.body, req);
    return created(res, result);
  },
);

orderRouter.get('/:orderCode/status', optionalAuth, async (req, res) => {
  const result = await getOrderStatus(req.params.orderCode!, req);
  return ok(res, result);
});

orderRouter.get('/:orderCode/tickets', optionalAuth, async (req, res) => {
  const result = await getOrderTickets(req.params.orderCode!, req);
  return ok(res, result);
});

orderRouter.get('/:orderCode/tickets/:ticketId/qr', optionalAuth, async (req, res) => {
  const { qrImageKey } = await getOrderTicketQr(
    req.params.orderCode!,
    req.params.ticketId!,
    req,
  );
  const buffer = await readPrivateFile(qrImageKey);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(buffer);
});

orderRouter.post('/:orderCode/payment', optionalAuth, checkoutLimiter, async (req, res) => {
  const result = await createOrderPaymentSession(req.params.orderCode!, req);
  return ok(res, result);
});

orderRouter.post('/:orderCode/mock-pay', optionalAuth, async (req, res) => {
  const result = await mockPayOrder(req.params.orderCode!, req);
  return ok(res, result);
});

export const accountOrderRouter = Router();

accountOrderRouter.use(requireAuth);

accountOrderRouter.get('/', validate(paginationSchema, 'query'), async (req, res) => {
  const query = req.query as unknown as { page: number; limit: number };
  const result = await listAccountOrders(req.auth!.userId, query);
  return ok(res, result.data, result.meta);
});
