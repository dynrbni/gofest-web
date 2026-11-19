import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { EventListQuery, EventManageQuery } from '@gofest/shared';
import { EVENT_CITIES, findEventCity } from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { assertOwnedImage } from '../uploads/upload.service';
import { enqueueEmail } from '../notifications/email.service';
import { notifyAdmins } from '../notifications/inbox.service';
import { citySchema } from '../cms/cms.schemas';
import { getPlatformSettings } from '../settings/settings.service';

type EventInput = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  categoryId: string;
  coverKey?: string | null;
  type: 'ONLINE' | 'OFFLINE';
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  onlineAccessUrl?: string | null;
  onlineAccessNote?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  rules?: string | null;
  refundPolicy?: string | null;
};

const summarySelect = {
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
  organizer: {
    select: { id: true, organizationName: true, slug: true, logoKey: true, status: true },
  },
  ticketTypes: {
    where: { isActive: true },
    select: { price: true, quotaTotal: true, quantitySold: true, quantityReserved: true },
  },
} as const;

function serializeSummary(event: Prisma.EventGetPayload<{ select: typeof summarySelect }>) {
  const { ticketTypes, ...rest } = event;
  const prices = ticketTypes.map((ticket) => ticket.price);
  const isSoldOut =
    ticketTypes.length === 0 ||
    ticketTypes.every(
      (ticket) => ticket.quantitySold + ticket.quantityReserved >= ticket.quotaTotal,
    );
  return {
    ...rest,
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    isSoldOut,
  };
}

export async function listPublicEvents(query: EventListQuery) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`e."status"::text = 'PUBLISHED'`,
    Prisma.sql`e."endsAt" > now()`,
  ];

  if (query.q) {
    const like = `%${query.q}%`;
    conditions.push(
      Prisma.sql`(
        e."title" ILIKE ${like}
        OR o."organizationName" ILIKE ${like}
        OR coalesce(e."city", '') ILIKE ${like}
        OR coalesce(e."venueName", '') ILIKE ${like}
        OR c."name" ILIKE ${like}
      )`,
    );
  }
  if (query.category) {
    conditions.push(Prisma.sql`c."slug" = ${query.category}`);
  }
  if (query.citySlug) {
    const city = findEventCity(query.citySlug);
    if (!city) throw new NotFoundError('Kota tidak ditemukan', 'CITY_NOT_FOUND');
    conditions.push(
      Prisma.sql`e."type"::text = 'OFFLINE'`,
      Prisma.sql`lower(btrim(e."city")) IN (${Prisma.join(city.aliases.map((alias) => alias.toLowerCase()))})`,
    );
  } else if (query.city) {
    const rows = await prisma.cmsCity.findMany({
      where: { published: { not: Prisma.DbNull } },
      select: { published: true },
    });
    const city = rows
      .flatMap((row) => {
        const parsed = citySchema.safeParse(row.published);
        return parsed.success ? [parsed.data] : [];
      })
      .find((entry) => entry.slug === query.city);
    const builtIn = city
      ? EVENT_CITIES.find((entry) =>
          entry.aliases.some((alias) => alias.toLowerCase() === city.name.toLowerCase()),
        )
      : findEventCity(query.city);
    if (city || builtIn) {
      const aliases = [
        ...new Set(
          [...(builtIn?.aliases ?? []), ...(city ? [city.name] : [])].map((name) =>
            name.toLowerCase(),
          ),
        ),
      ];
      conditions.push(
        Prisma.sql`e."type"::text = 'OFFLINE'`,
        Prisma.sql`lower(btrim(e."city")) IN (${Prisma.join(aliases)})`,
      );
    } else conditions.push(Prisma.sql`coalesce(e."city", '') ILIKE ${`%${query.city}%`}`);
  }
  if (query.dateFrom) {
    conditions.push(Prisma.sql`e."startsAt" >= ${new Date(query.dateFrom)}`);
  }
  if (query.dateTo) {
    conditions.push(Prisma.sql`e."startsAt" <= ${new Date(query.dateTo)}`);
  }
  if (query.price === 'free') {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "ticket_types" tp
        WHERE tp."eventId" = e."id" AND tp."isActive" = true AND tp."price" = 0
      )`,
    );
  }
  if (query.price === 'paid') {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "ticket_types" tp
        WHERE tp."eventId" = e."id" AND tp."isActive" = true AND tp."price" > 0
      )`,
    );
  }
  if (query.availability === 'available') {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "ticket_types" ta
        WHERE ta."eventId" = e."id" AND ta."isActive" = true
          AND ta."quantitySold" + ta."quantityReserved" < ta."quotaTotal"
      )`,
    );
  }
  if (query.availability === 'sold_out') {
    conditions.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1 FROM "ticket_types" ta
        WHERE ta."eventId" = e."id" AND ta."isActive" = true
          AND ta."quantitySold" + ta."quantityReserved" < ta."quotaTotal"
      )`,
    );
  }

  const whereSql = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
  const fromSql = Prisma.sql`
    FROM "events" e
    JOIN "event_categories" c ON c."id" = e."categoryId"
    JOIN "organizer_profiles" o ON o."id" = e."organizerId"
    WHERE ${whereSql}
  `;

  const [countRows, idRows] = await Promise.all([
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT count(*)::int AS count ${fromSql}`),
    prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT e."id" AS id ${fromSql}
        ORDER BY ${
          query.sort === 'published_newest'
            ? Prisma.sql`e."publishedAt" DESC NULLS LAST, e."id" DESC`
            : Prisma.sql`e."startsAt" ASC, e."id" ASC`
        }
        LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
      `,
    ),
  ]);

  const total = countRows[0]?.count ?? 0;
  const ids = idRows.map((row) => row.id);
  const events = await prisma.event.findMany({
    where: { id: { in: ids } },
    select: summarySelect,
  });
  const byId = new Map(events.map((event) => [event.id, event]));
  const data = ids
    .map((id) => byId.get(id))
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .map(serializeSummary);

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getPublicEvent(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      description: true,
      coverKey: true,
      type: true,
      venueName: true,
      address: true,
      city: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      salesStartAt: true,
      salesEndAt: true,
      rules: true,
      refundPolicy: true,
      status: true,
      isDemo: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      organizer: {
        select: { id: true, organizationName: true, slug: true, logoKey: true, status: true },
      },
      ticketTypes: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          quotaTotal: true,
          quantitySold: true,
          quantityReserved: true,
          salesStartAt: true,
          salesEndAt: true,
          minPerOrder: true,
          maxPerOrder: true,
          isActive: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!event || !['PUBLISHED', 'CANCELLED', 'COMPLETED'].includes(event.status)) {
    throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  }

  const now = new Date();
  const ticketTypes = event.ticketTypes.map((ticket) => {
    const available = Math.max(
      0,
      ticket.quotaTotal - ticket.quantitySold - ticket.quantityReserved,
    );
    const isOnSale =
      event.status === 'PUBLISHED' &&
      event.endsAt > now &&
      event.startsAt > now &&
      (!event.salesStartAt || event.salesStartAt <= now) &&
      (!event.salesEndAt || event.salesEndAt > now) &&
      (!ticket.salesStartAt || ticket.salesStartAt <= now) &&
      (!ticket.salesEndAt || ticket.salesEndAt > now) &&
      available > 0;
    return {
      ...ticket,
      available,
      isOnSale,
    };
  });

  const prices = ticketTypes.map((ticket) => ticket.price);
  const isSoldOut =
    ticketTypes.length === 0 || ticketTypes.every((ticket) => ticket.available <= 0);
  const isOnSale = ticketTypes.some((ticket) => ticket.isOnSale);

  return {
    ...event,
    ticketTypes,
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    priceTo: prices.length > 0 ? Math.max(...prices) : null,
    isSoldOut,
    isOnSale,
  };
}

export async function listPublicTicketTypes(slug: string) {
  const event = await getPublicEvent(slug);
  return {
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      startsAt: event.startsAt,
      timezone: event.timezone,
    },
    ticketTypes: event.ticketTypes,
  };
}

async function assertCategory(categoryId: string) {
  const category = await prisma.eventCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    throw new NotFoundError('Kategori tidak ditemukan atau tidak aktif', 'CATEGORY_NOT_FOUND');
  }
  return category;
}

function normalizeCoverKey(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return value.startsWith('/uploads/') ? value.slice('/uploads/'.length) : value;
}

export async function createEvent(organizerId: string, input: EventInput, req: Request) {
  await assertOwnedImage(
    input.coverKey,
    req.auth!.userId,
    'events',
    ['ADMIN', 'SUPERADMIN'].includes(req.auth!.role),
  );
  await assertCategory(input.categoryId);
  const slugOwner = await prisma.event.findUnique({ where: { slug: input.slug } });
  if (slugOwner) throw new ConflictError('Slug event sudah dipakai', 'EVENT_SLUG_TAKEN');

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        organizerId,
        categoryId: input.categoryId,
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        description: input.description,
        coverKey: normalizeCoverKey(input.coverKey) ?? null,
        type: input.type,
        venueName: input.venueName ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        onlineAccessUrl: input.onlineAccessUrl ?? null,
        onlineAccessNote: input.onlineAccessNote ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        timezone: input.timezone,
        salesStartAt: input.salesStartAt ? new Date(input.salesStartAt) : null,
        salesEndAt: input.salesEndAt ? new Date(input.salesEndAt) : null,
        rules: input.rules ?? null,
        refundPolicy: input.refundPolicy ?? null,
      },
      include: { category: true, ticketTypes: true },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'EVENT_CREATED',
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { title: event.title },
        req,
      },
      tx,
    );
    return event;
  });
}

export async function getOwnedEvent(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      category: true,
      ticketTypes: { orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] },
      staff: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { assignedAt: 'asc' },
      },
    },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }
  return event;
}

export async function updateEvent(
  eventId: string,
  organizerId: string,
  input: Partial<EventInput>,
  req: Request,
) {
  const current = await getOwnedEvent(eventId, organizerId);
  if (input.coverKey !== undefined && normalizeCoverKey(input.coverKey) !== current.coverKey) {
    await assertOwnedImage(
      input.coverKey,
      req.auth!.userId,
      'events',
      ['ADMIN', 'SUPERADMIN'].includes(req.auth!.role),
    );
  }
  if (current.status === 'CANCELLED' || current.status === 'COMPLETED') {
    throw new ConflictError('Event yang sudah dibatalkan atau selesai tidak dapat diubah');
  }
  if (input.categoryId) await assertCategory(input.categoryId);
  if (input.slug && input.slug !== current.slug) {
    const owner = await prisma.event.findUnique({ where: { slug: input.slug } });
    if (owner) throw new ConflictError('Slug event sudah dipakai', 'EVENT_SLUG_TAKEN');
  }

  const data: Prisma.EventUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.summary !== undefined) data.summary = input.summary;
  if (input.description !== undefined) data.description = input.description;
  if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
  if (input.coverKey !== undefined) data.coverKey = normalizeCoverKey(input.coverKey);
  if (input.type !== undefined) data.type = input.type;
  if (input.venueName !== undefined) data.venueName = input.venueName;
  if (input.address !== undefined) data.address = input.address;
  if (input.city !== undefined) data.city = input.city;
  if (input.onlineAccessUrl !== undefined) data.onlineAccessUrl = input.onlineAccessUrl;
  if (input.onlineAccessNote !== undefined) data.onlineAccessNote = input.onlineAccessNote;
  if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) data.endsAt = new Date(input.endsAt);
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.salesStartAt !== undefined) {
    data.salesStartAt = input.salesStartAt ? new Date(input.salesStartAt) : null;
  }
  if (input.salesEndAt !== undefined) {
    data.salesEndAt = input.salesEndAt ? new Date(input.salesEndAt) : null;
  }
  if (input.rules !== undefined) data.rules = input.rules;
  if (input.refundPolicy !== undefined) data.refundPolicy = input.refundPolicy;

  const importantFields = [
    'title',
    'startsAt',
    'endsAt',
    'venueName',
    'address',
    'city',
    'type',
    'onlineAccessUrl',
  ];
  if (
    ['PUBLISHED', 'APPROVED'].includes(current.status) &&
    req.auth?.role !== 'ADMIN' &&
    req.auth?.role !== 'SUPERADMIN' &&
    importantFields.some((key) => key in input)
  ) {
    data.status = 'PENDING_REVIEW';
    data.reviewNote = 'Perubahan informasi utama menunggu review ulang.';
  }

  const startsAt = data.startsAt instanceof Date ? data.startsAt : current.startsAt;
  const endsAt = data.endsAt instanceof Date ? data.endsAt : current.endsAt;
  if (endsAt <= startsAt) {
    throw new ConflictError('Waktu selesai harus setelah waktu mulai', 'INVALID_EVENT_TIME');
  }

  const effectiveType = input.type ?? current.type;
  const effectiveVenue = input.venueName !== undefined ? input.venueName : current.venueName;
  const effectiveAddress = input.address !== undefined ? input.address : current.address;
  const effectiveCity = input.city !== undefined ? input.city : current.city;
  if (effectiveType === 'OFFLINE' && (!effectiveVenue || !effectiveAddress || !effectiveCity)) {
    throw new ConflictError(
      'Event offline wajib memiliki nama venue, alamat, dan kota',
      'INCOMPLETE_OFFLINE_EVENT',
    );
  }

  const effectiveSalesStart =
    input.salesStartAt !== undefined
      ? input.salesStartAt
      : (current.salesStartAt?.toISOString() ?? null);
  const effectiveSalesEnd =
    input.salesEndAt !== undefined ? input.salesEndAt : (current.salesEndAt?.toISOString() ?? null);
  if (
    effectiveSalesStart &&
    effectiveSalesEnd &&
    new Date(effectiveSalesEnd) <= new Date(effectiveSalesStart)
  ) {
    throw new ConflictError(
      'Akhir penjualan harus setelah mulai penjualan',
      'INVALID_SALES_WINDOW',
    );
  }
  if (effectiveSalesEnd && new Date(effectiveSalesEnd) > startsAt) {
    throw new ConflictError(
      'Penjualan tiket tidak boleh melewati waktu mulai event',
      'SALES_END_AFTER_EVENT',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const event = await tx.event.update({
      where: { id: eventId },
      data,
      include: { category: true, ticketTypes: true },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'EVENT_UPDATED',
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { fields: Object.keys(input) },
        req,
      },
      tx,
    );
    return event;
  });

  return updated;
}

export async function deleteEvent(eventId: string, organizerId: string, req: Request) {
  const event = await getOwnedEvent(eventId, organizerId);
  if (!['DRAFT', 'REJECTED'].includes(event.status)) {
    throw new ConflictError(
      'Hanya draf atau event yang ditolak yang dapat dihapus. Batalkan event yang sudah tayang.',
      'EVENT_NOT_DELETABLE',
    );
  }
  const orderCount = await prisma.order.count({ where: { eventId } });
  if (orderCount > 0) {
    throw new ConflictError('Event ini sudah memiliki order dan tidak dapat dihapus');
  }

  await prisma.$transaction(async (tx) => {
    await tx.event.delete({ where: { id: eventId } });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'EVENT_DELETED',
        resourceType: 'EVENT',
        resourceId: eventId,
        metadata: { title: event.title },
        req,
      },
      tx,
    );
  });
  return { deleted: true };
}

export async function submitEvent(eventId: string, organizerId: string, req: Request) {
  const event = await getOwnedEvent(eventId, organizerId);
  if (!['DRAFT', 'REJECTED', 'NEEDS_REVISION'].includes(event.status)) {
    throw new ConflictError(
      'Event ini tidak dapat diajukan untuk publikasi',
      'EVENT_NOT_SUBMITTABLE',
    );
  }
  if (event.ticketTypes.filter((ticket) => ticket.isActive).length === 0) {
    throw new ConflictError(
      'Tambahkan minimal satu tipe tiket aktif sebelum mengajukan publikasi',
      'EVENT_NEEDS_TICKET_TYPE',
    );
  }
  const category = await prisma.eventCategory.findUnique({ where: { id: event.categoryId } });
  if (!category?.isActive) {
    throw new ConflictError('Kategori event tidak aktif', 'CATEGORY_INACTIVE');
  }

  const settings = await getPlatformSettings();
  const publishImmediately = !settings.eventReviewRequired;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.event.update({
      where: { id: eventId },
      data: publishImmediately
        ? { status: 'PUBLISHED', publishedAt: new Date(), reviewNote: null }
        : { status: 'PENDING_REVIEW', reviewNote: null },
    });
    if (!publishImmediately)
      await notifyAdmins(tx, {
        category: 'EVENT_REVIEW',
        title: 'Pengajuan event baru',
        message: `${event.title} menunggu review.`,
        href: '/admin/events?status=PENDING_REVIEW',
      });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: publishImmediately ? 'EVENT_PUBLISHED' : 'EVENT_SUBMITTED',
        resourceType: 'EVENT',
        resourceId: eventId,
        metadata: { status: result.status },
        req,
      },
      tx,
    );
    return result;
  });

  return updated;
}

async function cancelEventInternal(
  event: { id: string; title: string },
  reason: string,
  req: Request,
) {
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: event.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        reviewNote: reason,
      },
    });
    await tx.ticket.updateMany({
      where: { eventId: event.id, status: 'VALID' },
      data: { status: 'CANCELLED' },
    });
    const paidOrders = await tx.order.findMany({
      where: { eventId: event.id, status: 'PAID' },
      select: {
        id: true,
        orderCode: true,
        buyerName: true,
        buyerEmail: true,
      },
    });
    if (paidOrders.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: paidOrders.map((order) => order.id) } },
        data: { status: 'REFUND_PENDING', cancelledAt: new Date() },
      });
      for (const order of paidOrders) {
        await enqueueEmail(
          {
            to: order.buyerEmail,
            subject: `Event dibatalkan: ${event.title}`,
            template: 'EVENT_CANCELLED',
            payload: {
              buyerName: order.buyerName,
              eventTitle: event.title,
              orderCode: order.orderCode,
              reason,
            },
          },
          tx,
        );
      }
    }
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'EVENT_CANCELLED',
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { reason, affectedOrders: paidOrders.length },
        req,
      },
      tx,
    );
  });

  return { cancelled: true, refundPendingOrders: true };
}

export async function cancelOwnEvent(
  eventId: string,
  organizerId: string,
  reason: string,
  req: Request,
) {
  const event = await getOwnedEvent(eventId, organizerId);
  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    throw new ConflictError('Event ini sudah dibatalkan atau selesai', 'EVENT_ALREADY_CLOSED');
  }
  return cancelEventInternal({ id: event.id, title: event.title }, reason, req);
}

export async function cancelEventAsAdmin(eventId: string, reason: string, req: Request) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, status: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    throw new ConflictError('Event ini sudah dibatalkan atau selesai', 'EVENT_ALREADY_CLOSED');
  }
  return cancelEventInternal({ id: event.id, title: event.title }, reason, req);
}

export async function listOrganizerEvents(organizerId: string, query: EventManageQuery) {
  const now = new Date();
  const pastFilter: Prisma.EventWhereInput = {
    OR: [{ status: 'COMPLETED' }, { status: 'PUBLISHED', endsAt: { lte: now } }],
  };
  const where: Prisma.EventWhereInput = {
    organizerId,
    status: query.active && !query.period ? 'PUBLISHED' : query.status,
    ...(query.period === 'past' ? pastFilter : { endsAt: query.active ? { gt: now } : undefined }),
    ...(query.q
      ? {
          AND: {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { venueName: { contains: query.q, mode: 'insensitive' } },
              { city: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };
  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        ticketTypes: { orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] },
      },
    }),
  ]);

  return {
    data: events.map((event) => ({
      ...event,
      totalQuota: event.ticketTypes.reduce((sum, ticket) => sum + ticket.quotaTotal, 0),
      totalSold: event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantitySold, 0),
      totalReserved: event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantityReserved, 0),
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
