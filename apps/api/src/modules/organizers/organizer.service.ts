import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { publicOrganizerQuerySchema } from '@gofest/shared';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';

const publicOrganizerSelect = {
  id: true,
  organizationName: true,
  slug: true,
  description: true,
  logoKey: true,
  bannerKey: true,
  status: true,
  createdAt: true,
} as const;

export async function applyAsOrganizer(
  userId: string,
  input: { organizationName: string; slug: string; description?: string },
  req: Request,
) {
  const existing = await prisma.organizerProfile.findUnique({ where: { userId } });
  if (existing) {
    throw new ConflictError(
      existing.status === 'PENDING'
        ? 'Pengajuan organizer kamu sedang menunggu review'
        : 'Akun ini sudah memiliki profil organizer',
      'ORGANIZER_ALREADY_EXISTS',
    );
  }
  const slugOwner = await prisma.organizerProfile.findUnique({ where: { slug: input.slug } });
  if (slugOwner) {
    throw new ConflictError('Slug organizer sudah dipakai', 'ORGANIZER_SLUG_TAKEN');
  }

  return prisma.$transaction(async (tx) => {
    const profile = await tx.organizerProfile.create({
      data: {
        userId,
        organizationName: input.organizationName,
        slug: input.slug,
        description: input.description ?? null,
      },
    });
    await writeAudit(
      {
        actorUserId: userId,
        action: 'ORGANIZER_APPLIED',
        resourceType: 'ORGANIZER',
        resourceId: profile.id,
        metadata: { organizationName: profile.organizationName },
        req,
      },
      tx,
    );
    return profile;
  });
}

export async function getOwnOrganizer(userId: string) {
  const profile = await prisma.organizerProfile.findUnique({
    where: { userId },
    include: {
      _count: { select: { events: true } },
    },
  });
  if (!profile) {
    throw new NotFoundError('Kamu belum memiliki profil organizer', 'ORGANIZER_NOT_FOUND');
  }
  return profile;
}

export async function updateOwnOrganizer(
  userId: string,
  input: {
    organizationName?: string;
    slug?: string;
    description?: string;
    logoKey?: string | null;
    bannerKey?: string | null;
  },
  req: Request,
) {
  const profile = await prisma.organizerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundError('Kamu belum memiliki profil organizer', 'ORGANIZER_NOT_FOUND');
  }
  if (profile.status === 'SUSPENDED' || profile.status === 'REJECTED') {
    throw new ForbiddenError(
      'Profil organizer ini tidak dapat diubah. Hubungi admin untuk peninjauan.',
      'ORGANIZER_NOT_EDITABLE',
    );
  }
  if (input.slug && input.slug !== profile.slug) {
    const owner = await prisma.organizerProfile.findUnique({ where: { slug: input.slug } });
    if (owner) throw new ConflictError('Slug organizer sudah dipakai', 'ORGANIZER_SLUG_TAKEN');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.organizerProfile.update({
      where: { id: profile.id },
      data: {
        ...(input.organizationName !== undefined
          ? { organizationName: input.organizationName }
          : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.logoKey !== undefined ? { logoKey: input.logoKey } : {}),
        ...(input.bannerKey !== undefined ? { bannerKey: input.bannerKey } : {}),
      },
    });
    await writeAudit(
      {
        actorUserId: userId,
        action: 'ORGANIZER_PROFILE_UPDATED',
        resourceType: 'ORGANIZER',
        resourceId: profile.id,
        metadata: { fields: Object.keys(input) },
        req,
      },
      tx,
    );
    return updated;
  });
}

export async function getPublicOrganizer(
  slug: string,
  query: z.infer<typeof publicOrganizerQuerySchema>,
) {
  const publicStatuses = ['PUBLISHED', 'COMPLETED'] as const;
  const profile = await prisma.organizerProfile.findUnique({
    where: { slug },
    select: {
      ...publicOrganizerSelect,
      events: {
        where: { status: { in: [...publicStatuses] }, coverKey: { not: null } },
        orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
        take: 1,
        select: { coverKey: true },
      },
    },
  });
  if (!profile || profile.status !== 'ACTIVE')
    throw new NotFoundError('Organizer tidak ditemukan', 'ORGANIZER_NOT_FOUND');
  const now = new Date();
  const activeWhere: Prisma.EventWhereInput = {
    organizerId: profile.id,
    status: 'PUBLISHED',
    endsAt: { gt: now },
  };
  const pastWhere: Prisma.EventWhereInput = {
    organizerId: profile.id,
    OR: [{ status: 'COMPLETED' }, { status: 'PUBLISHED', endsAt: { lte: now } }],
  };
  const [active, past] = await prisma.$transaction([
    prisma.event.count({ where: activeWhere }),
    prisma.event.count({ where: pastWhere }),
  ]);
  const total = query.period === 'past' ? past : active;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const page = Math.min(query.page, totalPages);
  const events = await prisma.event.findMany({
    where: query.period === 'past' ? pastWhere : activeWhere,
    orderBy: [{ startsAt: query.period === 'past' ? 'desc' : 'asc' }, { id: 'asc' }],
    skip: (page - 1) * query.limit,
    take: query.limit,
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      coverKey: true,
      type: true,
      venueName: true,
      city: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      status: true,
      isDemo: true,
      category: { select: { id: true, name: true, slug: true } },
      ticketTypes: {
        where: { isActive: true },
        select: { price: true, quotaTotal: true, quantitySold: true, quantityReserved: true },
      },
    },
  });
  const { events: bannerEvents, ...organizer } = profile;
  return {
    ...organizer,
    fallbackBannerKey: bannerEvents[0]?.coverKey ?? null,
    eventCounts: { active, past, total: active + past },
    eventsPagination: {
      page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    events: events.map(({ ticketTypes, ...event }) => ({
      ...event,
      priceFrom: ticketTypes.length ? Math.min(...ticketTypes.map((ticket) => ticket.price)) : null,
      isSoldOut:
        ticketTypes.length === 0 ||
        ticketTypes.every(
          (ticket) => ticket.quantitySold + ticket.quantityReserved >= ticket.quotaTotal,
        ),
    })),
  };
}
