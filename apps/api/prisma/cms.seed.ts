import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { defaultCities } from '../src/modules/cms/cms.defaults';

export async function seedCmsCities() {
  return prisma.cmsCity.createMany({
    data: defaultCities.map(({ key, ...document }) => ({
      id: `cms-city-${key}`,
      key,
      slug: document.slug!,
      draft: document as Prisma.InputJsonObject,
      published: document as Prisma.InputJsonObject,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    })),
    skipDuplicates: true,
  });
}
