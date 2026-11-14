import { Router } from 'express';
import { listPublicCategories } from './category.service';
import { ok } from '../../lib/response';

export const categoryRouter = Router();

categoryRouter.get('/', async (_req, res) => {
  const categories = await listPublicCategories();
  return ok(res, { categories });
});
