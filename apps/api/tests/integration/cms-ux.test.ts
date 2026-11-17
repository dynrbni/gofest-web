import { readFile } from 'node:fs/promises';
import request from 'supertest';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { removePublicObject } from '../../src/lib/storage';
import { seedCmsCities } from '../../prisma/cms.seed';
import { createEvent, registerAgent, setupPublishedEvent } from '../helpers';

const app = createApp();
const base = '/api/v1/admin/cms';
const city = { name: 'Kota Baru', imageKey: '', accent: 'blue', visible: true, sortOrder: 0 };
async function admin(role: 'ADMIN' | 'SUPERADMIN' = 'SUPERADMIN') {
  const account = await registerAgent(app);
  await prisma.user.update({ where: { id: account.userId }, data: { role } });
  return account;
}
async function site() {
  const response = await request(app).get('/api/v1/cms/site');
  expect(response.status).toBe(200);
  return response.body.data;
}
async function cityUpload(
  agent: ReturnType<typeof request.agent>,
  buffer: Buffer,
  mime = 'image/png',
) {
  return agent
    .post('/api/v1/uploads')
    .field('folder', 'cms-cities')
    .attach('file', buffer, {
      filename: mime === 'image/webp' ? 'kota.webp' : 'kota.png',
      contentType: mime,
    });
}
const transparentImage = (width = 600, height = 600) =>
  sharp({ create: { width, height, channels: 4, background: { r: 0, g: 82, b: 204, alpha: 0.5 } } })
    .png()
    .toBuffer();

describe('CMS cities and atomic publication', () => {
  it('migrates five existing cities and reseeds idempotently without replacing editor changes', async () => {
    const migration = await readFile(
      'prisma/migrations/20261117030000_cms_cities_publication/migration.sql',
      'utf8',
    );
    const inserts = migration.slice(migration.indexOf('INSERT INTO "cms_cities"'));
    await prisma.$executeRawUnsafe(inserts);
    await prisma.$executeRawUnsafe(inserts);
    const rows = await prisma.cmsCity.findMany({ orderBy: { id: 'asc' } });
    expect(rows).toHaveLength(5);
    const publicCities = (await site()).cities;
    expect(publicCities.map((entry: { name: string }) => entry.name)).toEqual([
      'Jakarta',
      'Bandung',
      'Yogyakarta',
      'Surabaya',
      'Denpasar',
    ]);
    expect(publicCities.map((entry: { accent: string }) => entry.accent)).toEqual([
      'coral',
      'blue',
      'gold',
      'green',
      'cyan',
    ]);
    expect(
      publicCities.every(
        (entry: { slug: string; builtInIllustration: string; imageKey: string }) =>
          entry.slug === entry.builtInIllustration && entry.imageKey === '',
      ),
    ).toBe(true);
    const root = await admin();
    const jakarta = rows.find((row) => row.slug === 'jakarta')!;
    const edited = await root.agent.patch(`${base}/cities/${jakarta.id}`).send({
      document: { ...(jakarta.draft as object), name: 'Jakarta Raya' },
      expectedVersion: 1,
    });
    expect(edited.status).toBe(200);
    await seedCmsCities();
    const after = await prisma.cmsCity.findUniqueOrThrow({ where: { id: jakarta.id } });
    expect(after.draft).toEqual(edited.body.data.item.draft);
    expect(after.version).toBe(2);
    expect(after.published).toEqual(jakarta.published);
  });
  it('creates illustration-free cities with automatic unique slugs even under concurrent requests', async () => {
    const root = await admin();
    const responses = await Promise.all(
      ['kota-satu', 'kota-dua'].map((key) =>
        root.agent
          .post(`${base}/cities`)
          .send({ key, document: { ...city, name: 'Kota Semarang', slug: 'forged-url' } }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    const slugs = responses.map((response) => response.body.data.item.draft.slug).sort();
    expect(slugs).toEqual(['kota-semarang', 'kota-semarang-2']);
    expect((await site()).cities).toHaveLength(0);
    const items = responses.map((response) => ({
      collection: 'cities',
      id: response.body.data.item.id,
      expectedVersion: 1,
    }));
    const published = await root.agent.post(`${base}/publish-all`).send({ items });
    expect(published.status).toBe(200);
    expect((await site()).cities).toHaveLength(2);
    expect(
      (await site()).cities.every((entry: { imageKey: string }) => entry.imageKey === ''),
    ).toBe(true);
    expect(await prisma.cmsCity.count({ where: { slug: { in: slugs } } })).toBe(2);
    const first = responses[0]!.body.data.item;
    const renamed = await root.agent
      .patch(`${base}/cities/${first.id}`)
      .send({ document: { ...first.draft, name: 'Semarang Utara' }, expectedVersion: 2 });
    expect(renamed.body.data.item.draft.slug).toBe('semarang-utara');
    const stillReserved = await root.agent
      .post(`${base}/cities`)
      .send({ key: 'reserve-old', document: { ...city, name: 'Kota Semarang' } });
    expect(stillReserved.status).toBe(201);
    expect(stillReserved.body.data.item.draft.slug).toBe('kota-semarang-3');
  });
  it('enforces city role/media/preset constraints and prevents forged built-in illustrations', async () => {
    const root = await admin();
    const operational = await admin('ADMIN');
    const customer = await registerAgent(app);
    expect((await operational.agent.get(`${base}/cities`)).status).toBe(403);
    expect((await customer.agent.get(`${base}/cities`)).status).toBe(403);
    expect(
      (await operational.agent.post(`${base}/cities`).send({ key: 'no-access', document: city }))
        .status,
    ).toBe(403);
    expect(
      (
        await root.agent
          .post(`${base}/cities`)
          .send({ key: 'invalid-color', document: { ...city, accent: '#ff0000' } })
      ).status,
    ).toBe(422);
    expect(
      (
        await root.agent
          .post(`${base}/cities`)
          .send({ key: 'forged-sprite', document: { ...city, builtInIllustration: 'jakarta' } })
      ).status,
    ).toBe(400);
    expect(
      (
        await root.agent.post(`${base}/cities`).send({
          key: 'missing-image',
          document: { ...city, imageKey: 'cms-cities/missing.webp' },
        })
      ).status,
    ).toBe(400);
    await seedCmsCities();
    const migrated = await prisma.cmsCity.findUniqueOrThrow({ where: { key: 'jakarta' } });
    expect(
      (
        await root.agent.patch(`${base}/cities/${migrated.id}`).send({
          document: { ...(migrated.draft as object), builtInIllustration: 'bandung' },
          expectedVersion: 1,
        })
      ).status,
    ).toBe(400);
    const hidden = await root.agent
      .patch(`${base}/cities/${migrated.id}`)
      .send({ document: { ...(migrated.draft as object), visible: false }, expectedVersion: 1 });
    expect(hidden.status).toBe(200);
    expect(
      (await root.agent.post(`${base}/cities/${migrated.id}/publish`).send({ expectedVersion: 2 }))
        .status,
    ).toBe(200);
    expect(
      (await site()).cities.find((entry: { key: string }) => entry.key === 'jakarta').visible,
    ).toBe(false);
  });
  it('validates city illustration MIME/signature, transparency, square shape, dimensions and size', async () => {
    const root = await admin();
    const operational = await admin('ADMIN');
    expect((await cityUpload(operational.agent, await transparentImage())).status).toBe(403);
    expect((await cityUpload(root.agent, Buffer.from('not an image'))).status).toBe(400);
    expect((await cityUpload(root.agent, await transparentImage(600, 700))).status).toBe(400);
    expect((await cityUpload(root.agent, await transparentImage(599, 599))).status).toBe(400);
    const opaque = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 4,
        background: { r: 0, g: 82, b: 204, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    expect((await cityUpload(root.agent, opaque)).status).toBe(400);
    const jpeg = await sharp(await transparentImage())
      .jpeg()
      .toBuffer();
    expect((await cityUpload(root.agent, jpeg, 'image/jpeg')).status).toBe(400);
    expect((await cityUpload(root.agent, await transparentImage(), 'image/webp')).status).toBe(400);
    expect((await cityUpload(root.agent, Buffer.alloc(2 * 1024 * 1024 + 1))).status).toBe(400);
    const valid = await cityUpload(root.agent, await transparentImage());
    expect(valid.status).toBe(201);
    const key = valid.body.data.key;
    try {
      expect(valid.body.data).toMatchObject({ width: 600, height: 600, mimeType: 'image/webp' });
      const stored = await prisma.mediaAsset.findUniqueOrThrow({ where: { key } });
      expect(stored).toMatchObject({ folder: 'cms-cities', ownerId: root.userId });
      const created = await root.agent
        .post(`${base}/cities`)
        .send({ key: 'with-image', document: { ...city, imageKey: key } });
      expect(created.status).toBe(201);
      expect(
        (
          await root.agent
            .post(`${base}/cities/${created.body.data.item.id}/publish`)
            .send({ expectedVersion: 1 })
        ).status,
      ).toBe(200);
      expect((await site()).cities[0].imageKey).toBe(key);
    } finally {
      await removePublicObject(key);
    }
  });
  it('rolls back every published row, revision and audit if a later batch item has a stale version', async () => {
    const root = await admin();
    const a = await root.agent
      .post(`${base}/cities`)
      .send({ key: 'rollback-city', document: city });
    const b = await root.agent.post(`${base}/pages`).send({
      key: 'rollback-page',
      document: { title: 'Halaman baru', slug: 'halaman-baru', content: 'Konten' },
    });
    const result = await root.agent.post(`${base}/publish-all`).send({
      items: [
        { collection: 'cities', id: a.body.data.item.id, expectedVersion: 1 },
        { collection: 'pages', id: b.body.data.item.id, expectedVersion: 99 },
      ],
    });
    expect(result.status).toBe(409);
    const row = await prisma.cmsCity.findUniqueOrThrow({ where: { id: a.body.data.item.id } });
    expect(row).toMatchObject({ status: 'DRAFT', version: 1, published: null });
    expect(await prisma.cmsRevision.count({ where: { action: 'PUBLISH' } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'CMS_PUBLISH' } })).toBe(0);
    expect((await site()).cities).toHaveLength(0);
    const success = await root.agent.post(`${base}/publish-all`).send({
      items: [
        { collection: 'cities', id: a.body.data.item.id, expectedVersion: 1 },
        { collection: 'pages', id: b.body.data.item.id, expectedVersion: 1 },
      ],
    });
    expect(success.status).toBe(200);
    expect(success.body.data.items).toHaveLength(2);
    expect((await root.agent.get(`${base}/changes`)).body.data.items).toHaveLength(0);
    expect(await prisma.cmsRevision.count({ where: { action: 'PUBLISH' } })).toBe(2);
  });
  it('rejects mixed-role batches and filters changes/history to authorized content', async () => {
    const root = await admin();
    const operational = await admin('ADMIN');
    const section = await operational.agent
      .post(`${base}/sections`)
      .send({ key: 'events-for-you', document: { title: 'Pilihan sendiri', kind: 'events' } });
    const createdCity = await root.agent
      .post(`${base}/cities`)
      .send({ key: 'private-city', document: city });
    const all = (await root.agent.get(`${base}/changes`)).body.data.items;
    expect(all).toHaveLength(2);
    expect(all[0]).toHaveProperty('title');
    const allowed = (await operational.agent.get(`${base}/changes`)).body.data.items;
    expect(allowed).toHaveLength(1);
    expect(allowed[0].id).toBe(section.body.data.item.id);
    const mixed = await operational.agent.post(`${base}/publish-all`).send({
      items: [
        { collection: 'sections', id: section.body.data.item.id, expectedVersion: 1 },
        { collection: 'cities', id: createdCity.body.data.item.id, expectedVersion: 1 },
      ],
    });
    expect(mixed.status).toBe(403);
    expect(
      (await prisma.cmsSection.findUniqueOrThrow({ where: { id: section.body.data.item.id } }))
        .published,
    ).toBeNull();
    expect(
      (await operational.agent.get(`${base}/cities/${createdCity.body.data.item.id}/revisions`))
        .status,
    ).toBe(403);
    expect(
      (
        await operational.agent.post(`${base}/publish-all`).send({
          items: [{ collection: 'sections', id: section.body.data.item.id, expectedVersion: 1 }],
        })
      ).status,
    ).toBe(200);
    const history = await operational.agent.get(
      `${base}/sections/${section.body.data.item.id}/revisions`,
    );
    expect(history.status).toBe(200);
    expect(history.body.data.items.map((entry: { action: string }) => entry.action)).toEqual([
      'PUBLISH',
      'SAVE_DRAFT',
    ]);
    const duplicate = await root.agent.post(`${base}/publish-all`).send({
      items: [
        { collection: 'cities', id: createdCity.body.data.item.id, expectedVersion: 1 },
        { collection: 'cities', id: createdCity.body.data.item.id, expectedVersion: 1 },
      ],
    });
    expect(duplicate.status).toBe(422);
  });
  it('does not report normalized or unchanged drafts as unpublished changes', async () => {
    const root = await admin();
    const row = await root.agent.post(`${base}/cities`).send({ key: 'unchanged', document: city });
    const id = row.body.data.item.id;
    await root.agent.post(`${base}/cities/${id}/publish`).send({ expectedVersion: 1 });
    const edited = await root.agent
      .patch(`${base}/cities/${id}`)
      .send({ document: row.body.data.item.draft, expectedVersion: 2 });
    expect(edited.status).toBe(200);
    expect((await root.agent.get(`${base}/changes`)).body.data.items).toHaveLength(0);
  });
  it('shows scheduled banners only in their active published period while retaining draft preview', async () => {
    const root = await admin();
    const asset = await root.agent
      .post('/api/v1/uploads')
      .field('folder', 'cms')
      .attach('file', await transparentImage(), {
        filename: 'banner.png',
        contentType: 'image/png',
      });
    const imageKey = asset.body.data.key;
    try {
      const now = Date.now();
      const dates = [
        ['future', now + 3600000, now + 7200000],
        ['active', now - 3600000, now + 3600000],
        ['past', now - 7200000, now - 3600000],
      ] as const;
      for (const [key, start, end] of dates) {
        const saved = await root.agent.post(`${base}/banners`).send({
          key,
          document: {
            title: key,
            imageKey,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
          },
        });
        expect(saved.status).toBe(201);
        expect(
          (
            await root.agent
              .post(`${base}/banners/${saved.body.data.item.id}/publish`)
              .send({ expectedVersion: 1 })
          ).status,
        ).toBe(200);
      }
      expect((await site()).banners.map((entry: { key: string }) => entry.key)).toEqual(['active']);
      expect((await root.agent.get(`${base}/preview`)).body.data.banners).toHaveLength(3);
      const operational = await admin('ADMIN');
      expect((await operational.agent.get(`${base}/preview`)).body.data.banners).toHaveLength(1);
      expect(
        (
          await root.agent.post(`${base}/banners`).send({
            key: 'bad-period',
            document: {
              title: 'Periode salah',
              startsAt: new Date(now).toISOString(),
              endsAt: new Date(now - 1).toISOString(),
            },
          })
        ).status,
      ).toBe(422);
    } finally {
      await removePublicObject(imageKey);
    }
  });
  it('resolves a published custom city slug to its event city name', async () => {
    const root = await admin();
    const setup = await setupPublishedEvent(app);
    await prisma.event.update({ where: { id: setup.event.id }, data: { city: 'Semarang Utara' } });
    const second = await createEvent(setup.organizer.agent, setup.category.id);
    await prisma.event.update({
      where: { id: second.event.id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), city: 'Jakarta' },
    });
    const saved = await root.agent
      .post(`${base}/cities`)
      .send({ key: 'semarang', document: { ...city, name: 'Semarang Utara' } });
    await root.agent
      .post(`${base}/cities/${saved.body.data.item.id}/publish`)
      .send({ expectedVersion: 1 });
    const result = await request(app).get('/api/v1/events').query({ city: 'semarang-utara' });
    expect(result.status).toBe(200);
    expect(
      result.body.data.events?.map((entry: { id: string }) => entry.id) ??
        result.body.data.map((entry: { id: string }) => entry.id),
    ).toEqual([setup.event.id]);
    await seedCmsCities();
    const migrated = await prisma.cmsCity.findUniqueOrThrow({ where: { key: 'jakarta' } });
    const renamed = await root.agent
      .patch(`${base}/cities/${migrated.id}`)
      .send({
        document: { ...(migrated.draft as object), name: 'Semarang Utara' },
        expectedVersion: 1,
      });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.item.draft.builtInIllustration).toBe('jakarta');
    expect(
      (await root.agent.post(`${base}/cities/${migrated.id}/publish`).send({ expectedVersion: 2 }))
        .status,
    ).toBe(200);
    const renamedResults = await request(app)
      .get('/api/v1/events')
      .query({ city: renamed.body.data.item.draft.slug });
    expect(renamedResults.body.data.map((entry: { id: string }) => entry.id)).toEqual([
      setup.event.id,
    ]);
  });
});
