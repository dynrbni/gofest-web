import { Router } from 'express';
import { organizerApplicationSchema, organizerUpdateSchema } from '@gofest/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/response';
import {
  applyAsOrganizer,
  getOwnOrganizer,
  getPublicOrganizer,
  updateOwnOrganizer,
} from './organizer.service';

export const organizerRouter = Router();

organizerRouter.post('/apply', requireAuth, validate(organizerApplicationSchema), async (req, res) => {
  const profile = await applyAsOrganizer(req.auth!.userId, req.body, req);
  return created(res, { organizer: profile });
});

organizerRouter.get('/profile', requireAuth, async (req, res) => {
  const profile = await getOwnOrganizer(req.auth!.userId);
  return ok(res, { organizer: profile });
});

organizerRouter.patch('/profile', requireAuth, validate(organizerUpdateSchema), async (req, res) => {
  const profile = await updateOwnOrganizer(req.auth!.userId, req.body, req);
  return ok(res, { organizer: profile });
});

export const publicOrganizerRouter = Router();

publicOrganizerRouter.get('/:slug', async (req, res) => {
  const organizer = await getPublicOrganizer(req.params.slug!);
  return ok(res, { organizer });
});
