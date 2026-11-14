import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';

export async function listPublicCategories() {
  const categories = await prisma.eventCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: {
          events: {
            where: { status: 'PUBLISHED', endsAt: { gt: new Date() } },
          },
        },
      },
    },
  });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    eventCount: category._count.events,
  }));
}

export type CategoryInput = {
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
};

export async function listAllCategories() {
  return prisma.eventCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { events: true } } },
  });
}

export async function createCategory(input: CategoryInput, req: Request) {
  const existing = await prisma.eventCategory.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ConflictError('Slug kategori sudah dipakai', 'CATEGORY_SLUG_TAKEN');
  return prisma.$transaction(async (tx) => {
    const category = await tx.eventCategory.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        isActive: input.isActive,
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'CATEGORY_CREATED',
        resourceType: 'CATEGORY',
        resourceId: category.id,
        metadata: { name: category.name, slug: category.slug },
        req,
      },
      tx,
    );
    return category;
  });
}

export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryInput>,
  req: Request,
) {
  const category = await prisma.eventCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError('Kategori tidak ditemukan', 'CATEGORY_NOT_FOUND');
  if (input.slug && input.slug !== category.slug) {
    const owner = await prisma.eventCategory.findUnique({ where: { slug: input.slug } });
    if (owner) throw new ConflictError('Slug kategori sudah dipakai', 'CATEGORY_SLUG_TAKEN');
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.eventCategory.update({
      where: { id: categoryId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'CATEGORY_UPDATED',
        resourceType: 'CATEGORY',
        resourceId: categoryId,
        metadata: { fields: Object.keys(input) },
        req,
      },
      tx,
    );
    return updated;
  });
}
