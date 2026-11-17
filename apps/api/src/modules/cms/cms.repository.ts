import type { Prisma, CmsPage } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CmsCollection } from './cms.schemas';

export type CmsRow = CmsPage;
export type CmsDb = Prisma.TransactionClient | typeof prisma;

interface CmsStore {
  findMany(args?: { orderBy?: { key: 'asc' } }): Promise<CmsRow[]>;
  findUnique(args: { where: { id?: string; key?: string } }): Promise<CmsRow | null>;
  create(args: { data: Prisma.CmsPageUncheckedCreateInput }): Promise<CmsRow>;
  updateMany(args: {
    where: { id: string; version: number };
    data: Prisma.CmsPageUncheckedUpdateManyInput;
  }): Promise<{ count: number }>;
  deleteMany(args: { where: { id: string; version?: number } }): Promise<{ count: number }>;
}

// All CMS entities share versioned publication columns while keeping separate tables.
export function cmsStore(collection: CmsCollection, db: CmsDb = prisma): CmsStore {
  const cities: CmsStore = {
    findMany: (args) => db.cmsCity.findMany(args),
    findUnique: (args) => db.cmsCity.findUnique(args),
    create: (args) =>
      db.cmsCity.create({
        ...args,
        data: { ...args.data, slug: (args.data.draft as { slug: string }).slug },
      }),
    updateMany: (args) =>
      db.cmsCity.updateMany({
        ...args,
        data: {
          ...args.data,
          ...(args.data.draft ? { slug: (args.data.draft as { slug: string }).slug } : {}),
        },
      }),
    deleteMany: (args) => db.cmsCity.deleteMany(args),
  };
  return {
    sections: db.cmsSection,
    banners: db.cmsBanner,
    pages: db.cmsPage,
    navigation: db.cmsNavigationItem,
    settings: db.websiteSetting,
    cities,
  }[collection];
}
