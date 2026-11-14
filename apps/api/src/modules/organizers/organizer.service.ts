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
  input: { organizationName?: string; slug?: string; description?: string; logoKey?: string | null },
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

export async function getPublicOrganizer(slug: string) {
  const profile = await prisma.organizerProfile.findUnique({
    where: { slug },
    select: {
      ...publicOrganizerSelect,
      events: {
        where: { status: 'PUBLISHED', endsAt: { gt: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 24,
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
            select: {
              price: true,
              quotaTotal: true,
              quantitySold: true,
              quantityReserved: true,
            },
          },
        },
      },
    },
  });

  if (!profile || profile.status !== 'ACTIVE') {
    throw new NotFoundError('Organizer tidak ditemukan', 'ORGANIZER_NOT_FOUND');
  }

  return {
    ...profile,
    events: profile.events.map((event) => {
      const { ticketTypes, ...rest } = event;
      const prices = ticketTypes.map((ticket) => ticket.price);
      return {
        ...rest,
        priceFrom: prices.length > 0 ? Math.min(...prices) : null,
        isSoldOut: ticketTypes.every(
          (ticket) => ticket.quantitySold + ticket.quantityReserved >= ticket.quotaTotal,
        ),
      };
    }),
  };
}
