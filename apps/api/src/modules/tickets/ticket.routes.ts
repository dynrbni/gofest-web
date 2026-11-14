import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { ok } from '../../lib/response';
import { readPrivateFile } from '../../lib/storage';
import { getTicketByCode, getTicketQrByCode } from './ticket.service';

export const ticketRouter = Router();

ticketRouter.get('/:ticketCode', optionalAuth, async (req, res) => {
  const result = await getTicketByCode(req.params.ticketCode!, req);
  return ok(res, result);
});

ticketRouter.get('/:ticketCode/qr', optionalAuth, async (req, res) => {
  const { qrImageKey } = await getTicketQrByCode(req.params.ticketCode!, req);
  const buffer = await readPrivateFile(qrImageKey);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(buffer);
});