import { Prisma } from '@prisma/client';
import type { ZodTypeAny, output } from 'zod';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  zodIssuesToDetails,
} from '../../lib/errors';
import {
  cmsCollections,
  documentSchemas,
  websiteSchema,
  sectionSchema,
  bannerSchema,
  navigationSchema,
  pageSchema,
  type CmsCollection,
  type SectionDocument,
} from './cms.schemas';
import { defaultSections, defaultWebsite } from './cms.defaults';
import { cmsStore, type CmsDb, type CmsRow } from './cms.repository';

function authorize(collection: CmsCollection, key: string, req: Request) {
  if (req.auth?.role === 'SUPERADMIN') return;
  if (req.auth?.role === 'ADMIN' && collection === 'sections' && key === 'events-for-you') return;
  throw new ForbiddenError('Website CMS hanya dapat dikelola Superadmin', 'CMS_FORBIDDEN');
}
function parseDocument(collection: CmsCollection, document: unknown) {
  const result = documentSchemas[collection].safeParse(document);
  if (!result.success)
    throw new UnprocessableEntityError(
      'Konten CMS tidak valid',
      zodIssuesToDetails(result.error.issues),
    );
  return result.data as Prisma.InputJsonObject;
}
async function validateReferences(
  collection: CmsCollection,
  document: Prisma.InputJsonObject,
  req: Request,
  db: CmsDb,
) {
  if (collection === 'sections') {
    if (req.auth!.role !== 'SUPERADMIN' && document.kind !== 'events')
      throw new ForbiddenError('Admin hanya dapat mengelola section event');
    const ids = (document.eventIds ?? []) as string[];
    if (ids.length) {
      const count = await db.event.count({
        where: {
          id: { in: ids },
          status: { in: ['APPROVED', 'PUBLISHED'] },
          endsAt: { gt: new Date() },
          organizer: { status: 'ACTIVE' },
        },
      });
      if (count !== ids.length)
        throw new BadRequestError('Pilih event aktif yang sudah disetujui atau dipublikasikan');
    }
  }
  if (collection === 'pages') {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('gofest-cms-page-slugs'))`;
    const records = await db.cmsPage.findMany({
      select: { id: true, key: true, draft: true, published: true },
    });
    const slug = document.slug;
    const conflict = records.some(
      (row) =>
        row.id !== req.params.id &&
        ((row.draft as { slug?: string }).slug === slug ||
          (row.published as { slug?: string } | null)?.slug === slug),
    );
    if (conflict) throw new ConflictError('Slug halaman sudah digunakan');
  }
  if (
    collection === 'navigation' &&
    typeof document.href === 'string' &&
    document.href.startsWith('/')
  ) {
    const path = new URL(document.href, 'https://gofest.invalid').pathname;
    const known =
      /^\/(?:$|events(?:\/|$)|cities(?:\/|$)|organizers\/|organizer(?:\/|$)|creator(?:\/|$)|account(?:\/|$)|login$|register$|forgot-password$|reset-password$|terms$|privacy$|checkout\/|order\/|ticket\/)/.test(
        path,
      );
    if (!known) {
      const slug = path.replace(/^\/(?:pages\/|p\/)?/, '').replace(/\/$/, '');
      const pages = await db.cmsPage.findMany({ select: { draft: true, published: true } });
      if (
        !pages.some(
          (page) =>
            (page.draft as { slug?: string }).slug === slug ||
            (page.published as { slug?: string } | null)?.slug === slug,
        )
      )
        throw new BadRequestError(
          'Tujuan internal harus berupa route website atau halaman CMS yang sudah dibuat',
        );
    }
  }
  const images = [
    'imageKey',
    'mobileImageKey',
    'logoKey',
    'faviconKey',
    'ogImageKey',
    'footerLogoKey',
  ];
  for (const field of images) {
    const key = document[field];
    if (typeof key !== 'string' || !key) continue;
    const media = await db.mediaAsset.findUnique({ where: { key } });
    if (!media || (media.ownerId !== req.auth!.userId && req.auth!.role !== 'SUPERADMIN'))
      throw new BadRequestError('Gambar harus berasal dari media uploader akun ini');
  }
}
async function featuredRows(
  db: CmsDb,
  sectionId: string,
  document: Prisma.InputJsonObject,
  stage: 'DRAFT' | 'PUBLISHED',
) {
  await db.featuredEvent.deleteMany({ where: { sectionId, stage } });
  const ids = (document.eventIds ?? []) as string[];
  if (ids.length)
    await db.featuredEvent.createMany({
      data: ids.map((eventId, sortOrder) => ({ sectionId, eventId, sortOrder, stage })),
    });
}

export async function listCms(collection: CmsCollection, req: Request) {
  if (req.auth!.role !== 'SUPERADMIN' && collection !== 'sections')
    throw new ForbiddenError('Website CMS hanya dapat diakses Superadmin');
  const items = await cmsStore(collection).findMany({ orderBy: { key: 'asc' } });
  return {
    items:
      req.auth!.role === 'SUPERADMIN'
        ? items
        : items.filter((item) => item.key === 'events-for-you'),
  };
}
export async function saveCms(
  collection: CmsCollection,
  id: string | undefined,
  input: { key?: string; document: unknown; expectedVersion?: number },
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    const store = cmsStore(collection, tx);
    const existing = id ? await store.findUnique({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundError('Konten CMS tidak ditemukan');
    const key = existing?.key ?? input.key;
    if (!key) throw new BadRequestError('Key konten wajib diisi');
    authorize(collection, key, req);
    if (collection === 'settings' && key !== 'general')
      throw new BadRequestError('Pengaturan website menggunakan key general');
    const document = parseDocument(collection, input.document);
    await validateReferences(collection, document, req, tx);
    let row: CmsRow;
    if (existing) {
      if (input.expectedVersion === undefined)
        throw new BadRequestError(
          'Versi konten wajib dikirim. Muat ulang editor sebelum menyimpan.',
        );
      const result = await store.updateMany({
        where: { id: existing.id, version: input.expectedVersion ?? existing.version },
        data: {
          draft: document,
          version: { increment: 1 },
          status: 'DRAFT',
          updatedByUserId: req.auth!.userId,
        },
      });
      if (!result.count) throw new ConflictError('Konten berubah. Muat ulang sebelum menyimpan.');
      row = (await store.findUnique({ where: { id: existing.id } }))!;
    } else {
      if (await store.findUnique({ where: { key } }))
        throw new ConflictError('Key konten sudah digunakan');
      row = await store.create({
        data: {
          key,
          draft: document,
          status: 'DRAFT',
          createdByUserId: req.auth!.userId,
          updatedByUserId: req.auth!.userId,
        },
      });
    }
    if (collection === 'sections') await featuredRows(tx, row.id, document, 'DRAFT');
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'CMS_SAVE_DRAFT',
        resourceType: 'CMS',
        resourceId: row.id,
        metadata: { collection, key, version: row.version },
        req,
      },
      tx,
    );
    return { item: row };
  });
}
export async function publishCms(
  collection: CmsCollection,
  id: string,
  version: number,
  publish: boolean,
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    const store = cmsStore(collection, tx);
    const row = await store.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Konten CMS tidak ditemukan');
    authorize(collection, row.key, req);
    const document = parseDocument(collection, row.draft);
    if (publish) await validateReferences(collection, document, req, tx);
    if (publish && collection === 'banners' && !document.imageKey)
      throw new BadRequestError('Unggah gambar banner sebelum publikasi');
    const result = await store.updateMany({
      where: { id, version },
      data: {
        status: publish ? 'PUBLISHED' : 'UNPUBLISHED',
        published: publish ? document : Prisma.DbNull,
        publishedAt: publish ? new Date() : row.publishedAt,
        publishedByUserId: req.auth!.userId,
        updatedByUserId: req.auth!.userId,
        version: { increment: 1 },
      },
    });
    if (!result.count) throw new ConflictError('Konten berubah. Muat ulang sebelum publikasi.');
    if (collection === 'sections') {
      if (publish) await featuredRows(tx, id, document, 'PUBLISHED');
      else await tx.featuredEvent.deleteMany({ where: { sectionId: id, stage: 'PUBLISHED' } });
    }
    await tx.cmsRevision.create({
      data: {
        collection,
        entityId: id,
        version: version + 1,
        document,
        action: publish ? 'PUBLISH' : 'UNPUBLISH',
        actorUserId: req.auth!.userId,
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: publish ? 'CMS_PUBLISH' : 'CMS_UNPUBLISH',
        resourceType: 'CMS',
        resourceId: id,
        metadata: { collection, key: row.key, version: version + 1 },
        req,
      },
      tx,
    );
    return { item: await store.findUnique({ where: { id } }) };
  });
}
export async function deleteCms(collection: CmsCollection, id: string, req: Request) {
  return prisma.$transaction(async (tx) => {
    const store = cmsStore(collection, tx);
    const row = await store.findUnique({ where: { id } });
    if (!row) throw new NotFoundError();
    authorize(collection, row.key, req);
    if (
      collection === 'settings' ||
      (collection === 'sections' && defaultSections.some((section) => section.key === row.key))
    )
      throw new BadRequestError(
        'Section inti tidak dapat dihapus. Gunakan sembunyikan atau unpublish.',
      );
    const result = await store.deleteMany({ where: { id, version: row.version } });
    if (!result.count) throw new ConflictError('Konten berubah. Muat ulang sebelum menghapus.');
    await tx.cmsRevision.create({
      data: {
        collection,
        entityId: id,
        version: row.version + 1,
        document: row.draft as Prisma.InputJsonObject,
        action: 'DELETE',
        actorUserId: req.auth!.userId,
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'CMS_DELETE',
        resourceType: 'CMS',
        resourceId: id,
        metadata: { collection, key: row.key },
        req,
      },
      tx,
    );
    return { deleted: true };
  });
}

const cmsEventInclude = {
  organizer: {
    select: { id: true, organizationName: true, slug: true, logoKey: true, status: true },
  },
  category: { select: { id: true, name: true, slug: true } },
  ticketTypes: {
    where: { isActive: true },
    select: { price: true, quantitySold: true, quantityReserved: true, quotaTotal: true },
  },
} as const;
function eventCard(event: Prisma.EventGetPayload<{ include: typeof cmsEventInclude }>) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    summary: event.summary,
    coverKey: event.coverKey,
    type: event.type,
    venueName: event.venueName,
    city: event.city,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    status: event.status,
    isDemo: event.isDemo,
    organizer: event.organizer,
    category: event.category,
    priceFrom: event.ticketTypes.length
      ? Math.min(...event.ticketTypes.map((ticket) => ticket.price))
      : null,
    isSoldOut:
      !event.ticketTypes.length ||
      event.ticketTypes.every(
        (ticket) => ticket.quantitySold + ticket.quantityReserved >= ticket.quotaTotal,
      ),
  };
}
export async function cmsEvents(input: { q?: string; ids?: string; page: number; limit: number }) {
  const ids = input.ids?.split(',').filter(Boolean).slice(0, 100);
  const where: Prisma.EventWhereInput = {
    status: { in: ['APPROVED', 'PUBLISHED'] },
    endsAt: { gt: new Date() },
    organizer: { status: 'ACTIVE' },
    ...(ids ? { id: { in: ids } } : {}),
    ...(input.q
      ? {
          OR: [
            { title: { contains: input.q, mode: 'insensitive' } },
            { organizer: { organizationName: { contains: input.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: cmsEventInclude,
      orderBy: { startsAt: 'asc' },
      take: ids ? 100 : input.limit,
      skip: ids ? 0 : (input.page - 1) * input.limit,
    }),
    prisma.event.count({ where }),
  ]);
  return {
    events: events.map(eventCard),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
    },
  };
}
async function sectionEvents(document: SectionDocument) {
  if (document.kind !== 'events' && document.kind !== 'hero') return [];
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      endsAt: { gt: new Date() },
      organizer: { status: 'ACTIVE' },
      ...(document.source === 'manual' ? { id: { in: document.eventIds } } : {}),
    },
    include: cmsEventInclude,
    orderBy:
      document.source === 'latest'
        ? { publishedAt: 'desc' }
        : document.source === 'popular'
          ? { tickets: { _count: 'desc' } }
          : { startsAt: 'asc' },
    take: document.source === 'manual' ? 100 : document.limit,
  });
  if (document.source === 'manual')
    events.sort((a, b) => document.eventIds.indexOf(a.id) - document.eventIds.indexOf(b.id));
  return events.slice(0, document.limit).map(eventCard);
}

export async function getCmsSite(previewReq?: Request) {
  const all = await Promise.all(
    cmsCollections.map(async (collection) => ({
      collection,
      rows: await cmsStore(collection).findMany(),
    })),
  );
  function read<S extends ZodTypeAny>(
    collection: CmsCollection,
    schema: S,
  ): Array<{ id: string; key: string } & output<S>> {
    const rows = all.find((group) => group.collection === collection)!.rows;
    return rows.flatMap((row) => {
      const preview =
        previewReq &&
        (previewReq.auth!.role === 'SUPERADMIN' ||
          (collection === 'sections' && row.key === 'events-for-you'));
      const document = preview ? row.draft : row.published;
      if (!document) return [];
      const parsed = schema.safeParse(document);
      return parsed.success ? [{ id: row.id, key: row.key, ...parsed.data }] : [];
    });
  }
  const settings =
    read('settings', websiteSchema).find((item) => item.key === 'general') ?? defaultWebsite;
  const sections = await Promise.all(
    read('sections', sectionSchema).map(async (item) => ({
      ...item,
      events: await sectionEvents(item),
    })),
  );
  const banners = read('banners', bannerSchema);
  const navigation = read('navigation', navigationSchema);
  const pages = previewReq ? read('pages', pageSchema) : undefined;
  const updatedAt =
    all
      .flatMap(({ rows }) => rows.map((row) => row.updatedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString() ?? null;
  return {
    settings,
    sections,
    banners,
    navigation,
    pages,
    updatedAt,
    preview: Boolean(previewReq),
  };
}
export async function getCmsPage(slug: string) {
  const rows = await prisma.cmsPage.findMany({ where: { published: { not: Prisma.DbNull } } });
  const page = rows
    .map((row) => row.published as Prisma.JsonObject)
    .find((document) => document.slug === slug && document.visible === true);
  if (!page) throw new NotFoundError('Halaman belum dipublikasikan');
  return { page };
}
export async function cmsOverview() {
  const site = await getCmsSite();
  const rows = (
    await Promise.all(cmsCollections.map((collection) => cmsStore(collection).findMany()))
  ).flat();
  return {
    websiteStatus: site.settings.maintenance ? 'MAINTENANCE' : 'ACTIVE',
    counts: {
      published: rows.filter((row) => row.published !== null).length,
      draft: rows.filter((row) => row.status === 'DRAFT').length,
      banners: site.banners.filter((item) => item.visible).length,
      sections: site.sections.length,
    },
    lastUpdated: site.updatedAt,
    activities: await prisma.auditLog.findMany({
      where: { resourceType: 'CMS' },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { actor: { select: { name: true } } },
    }),
  };
}
