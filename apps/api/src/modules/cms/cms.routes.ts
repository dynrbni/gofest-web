import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireSuperadmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/response';
import { collectionSchema, saveCmsSchema, publishCmsSchema } from './cms.schemas';
import {
  cmsEvents,
  cmsOverview,
  deleteCms,
  getCmsPage,
  getCmsSite,
  listCms,
  publishCms,
  saveCms,
} from './cms.service';

export const cmsAdminRouter = Router();
cmsAdminRouter.use(requireAuth, requireAdmin);
cmsAdminRouter.get('/overview', requireSuperadmin, async (_req, res) =>
  ok(res, await cmsOverview()),
);
cmsAdminRouter.get('/preview', async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  return ok(res, await getCmsSite(req));
});
const eventQuery = z.object({
  q: z.string().max(120).optional(),
  ids: z.string().max(12000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
cmsAdminRouter.get('/events', validate(eventQuery, 'query'), async (req, res) =>
  ok(res, await cmsEvents(eventQuery.parse(req.query))),
);
cmsAdminRouter.get('/:collection', async (req, res) =>
  ok(res, await listCms(collectionSchema.parse(req.params.collection), req)),
);
cmsAdminRouter.post('/:collection', validate(saveCmsSchema), async (req, res) =>
  created(
    res,
    await saveCms(collectionSchema.parse(req.params.collection), undefined, req.body, req),
  ),
);
cmsAdminRouter.patch('/:collection/:id', validate(saveCmsSchema), async (req, res) =>
  ok(
    res,
    await saveCms(collectionSchema.parse(req.params.collection), req.params.id!, req.body, req),
  ),
);
cmsAdminRouter.post('/:collection/:id/publish', validate(publishCmsSchema), async (req, res) =>
  ok(
    res,
    await publishCms(
      collectionSchema.parse(req.params.collection),
      req.params.id!,
      req.body.expectedVersion,
      true,
      req,
    ),
  ),
);
cmsAdminRouter.post('/:collection/:id/unpublish', validate(publishCmsSchema), async (req, res) =>
  ok(
    res,
    await publishCms(
      collectionSchema.parse(req.params.collection),
      req.params.id!,
      req.body.expectedVersion,
      false,
      req,
    ),
  ),
);
cmsAdminRouter.delete('/:collection/:id', async (req, res) =>
  ok(res, await deleteCms(collectionSchema.parse(req.params.collection), req.params.id!, req)),
);

export const cmsPublicRouter = Router();
cmsPublicRouter.get('/site', async (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  return ok(res, await getCmsSite());
});
cmsPublicRouter.get('/pages/:slug', async (req, res) =>
  ok(res, await getCmsPage(req.params.slug!)),
);
