import request from 'supertest';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { removePublicObject } from '../../src/lib/storage';
import {
  createEvent,
  registerAgent,
  setupOrganizer,
  setupPublishedEvent,
  PASSWORD,
} from '../helpers';

const app = createApp();
const base = '/api/v1/admin/cms';
const section = {
  title: 'Pilihan tim GOFEST',
  kind: 'events',
  source: 'manual',
  visible: true,
  sortOrder: 2,
  limit: 8,
  eventIds: [],
  layout: 'grid',
};
const page = {
  title: 'Tentang GOFEST',
  slug: 'tentang-kami',
  content: '## Bertemu di acara\nCerita tentang GOFEST.',
  visible: true,
};
async function admin(role: 'ADMIN' | 'SUPERADMIN' = 'SUPERADMIN') {
  const account = await registerAgent(app);
  await prisma.user.update({ where: { id: account.userId }, data: { role } });
  return account;
}
async function publicSite() {
  const response = await request(app).get('/api/v1/cms/site');
  expect(response.status).toBe(200);
  return response.body.data;
}

describe('website CMS publication and permissions', () => {
  it('limits Admin to the featured section and rejects customer/Creator CMS access', async () => {
    const root = await admin();
    const operational = await admin('ADMIN');
    const creator = await setupOrganizer(app);
    expect((await request(app).get(`${base}/sections`)).status).toBe(401);
    expect((await creator.agent.get(`${base}/sections`)).status).toBe(403);
    const hero = await root.agent
      .post(`${base}/sections`)
      .send({ key: 'hero', document: { ...section, kind: 'hero' } });
    expect(hero.status).toBe(201);
    const featured = await operational.agent
      .post(`${base}/sections`)
      .send({ key: 'events-for-you', document: section });
    expect(featured.status).toBe(201);
    const ownList = await operational.agent.get(`${base}/sections`);
    expect(ownList.body.data.items.map((item: { key: string }) => item.key)).toEqual([
      'events-for-you',
    ]);
    expect((await operational.agent.get(`${base}/settings`)).status).toBe(403);
    expect((await operational.agent.get(`${base}/overview`)).status).toBe(403);
    expect(
      (
        await operational.agent
          .post(`${base}/sections`)
          .send({ key: 'other-events', document: section })
      ).status,
    ).toBe(403);
    expect(
      (
        await operational.agent
          .patch(`${base}/sections/${hero.body.data.item.id}`)
          .send({ document: section })
      ).status,
    ).toBe(403);
    expect(
      (
        await operational.agent
          .patch(`${base}/sections/${featured.body.data.item.id}`)
          .send({ document: { ...section, kind: 'hero' } })
      ).status,
    ).toBe(403);
    expect(
      (
        await operational.agent
          .post(`${base}/sections/${featured.body.data.item.id}/publish`)
          .send({ expectedVersion: 1 })
      ).status,
    ).toBe(200);
    expect((await root.agent.get(`${base}/overview`)).status).toBe(200);
  });

  it('isolates page drafts, serves published snapshots and removes unpublished pages', async () => {
    const root = await admin();
    const created = await root.agent.post(`${base}/pages`).send({ key: 'about', document: page });
    expect(created.status).toBe(201);
    const item = created.body.data.item;
    expect(item).toMatchObject({
      status: 'DRAFT',
      version: 1,
      createdByUserId: root.userId,
      updatedByUserId: root.userId,
      published: null,
    });
    expect((await request(app).get('/api/v1/cms/pages/tentang-kami')).status).toBe(404);
    const preview = await root.agent.get(`${base}/preview`);
    expect(preview.body.data.pages[0].content).toBe(page.content);
    expect(preview.headers['cache-control']).toContain('private');
    const published = await root.agent
      .post(`${base}/pages/${item.id}/publish`)
      .send({ expectedVersion: 1 });
    expect(published.status).toBe(200);
    expect(published.body.data.item).toMatchObject({
      status: 'PUBLISHED',
      version: 2,
      publishedByUserId: root.userId,
    });
    expect(published.body.data.item.publishedAt).toBeTruthy();
    const edited = await root.agent
      .patch(`${base}/pages/${item.id}`)
      .send({ expectedVersion: 2, document: { ...page, content: 'Isi draft baru.' } });
    expect(edited.status).toBe(200);
    expect(edited.body.data.item.status).toBe('DRAFT');
    expect((await request(app).get('/api/v1/cms/pages/tentang-kami')).body.data.page.content).toBe(
      page.content,
    );
    expect((await root.agent.get(`${base}/preview`)).body.data.pages[0].content).toBe(
      'Isi draft baru.',
    );
    const withdrawn = await root.agent
      .post(`${base}/pages/${item.id}/unpublish`)
      .send({ expectedVersion: 3 });
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.item.status).toBe('UNPUBLISHED');
    expect((await request(app).get('/api/v1/cms/pages/tentang-kami')).status).toBe(404);
    expect(
      await prisma.cmsRevision.count({
        where: { entityId: item.id, action: { in: ['PUBLISH', 'UNPUBLISH'] } },
      }),
    ).toBe(2);
    expect(
      await prisma.cmsRevision.count({ where: { entityId: item.id, action: 'SAVE_DRAFT' } }),
    ).toBe(2);
    expect(
      await prisma.auditLog.count({ where: { resourceType: 'CMS', resourceId: item.id } }),
    ).toBe(4);
  });

  it('rejects stale writes and serializes concurrent publication of one version', async () => {
    const root = await admin();
    const created = await root.agent.post(`${base}/pages`).send({ key: 'about', document: page });
    const id = created.body.data.item.id;
    const changed = await root.agent
      .patch(`${base}/pages/${id}`)
      .send({ expectedVersion: 1, document: { ...page, title: 'Tentang kami terbaru' } });
    expect(changed.status).toBe(200);
    expect(
      (await root.agent.patch(`${base}/pages/${id}`).send({ expectedVersion: 1, document: page }))
        .status,
    ).toBe(409);
    expect(
      (await root.agent.post(`${base}/pages/${id}/publish`).send({ expectedVersion: 1 })).status,
    ).toBe(409);
    const published = await Promise.all([
      root.agent.post(`${base}/pages/${id}/publish`).send({ expectedVersion: 2 }),
      root.agent.post(`${base}/pages/${id}/publish`).send({ expectedVersion: 2 }),
    ]);
    expect(published.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await prisma.cmsRevision.count({ where: { entityId: id, action: 'PUBLISH' } })).toBe(1);
    expect((await request(app).get('/api/v1/cms/pages/tentang-kami')).body.data.page.title).toBe(
      'Tentang kami terbaru',
    );
  });

  it.each([
    'javascript:alert(1)',
    '//external.example.com',
    '/\\external.example.com',
    'data:text/html,test',
  ])('rejects unsafe navigation destination %s', async (href) => {
    const root = await admin();
    const response = await root.agent
      .post(`${base}/navigation`)
      .send({ key: 'bad-link', document: { label: 'Tautan', href, placement: 'HEADER' } });
    expect(response.status).toBe(422);
    expect(await prisma.cmsNavigationItem.count()).toBe(0);
  });

  it('rejects reserved or duplicate slugs and media paths that bypass uploads', async () => {
    const root = await admin();
    expect(
      (
        await root.agent
          .post(`${base}/pages`)
          .send({ key: 'reserved', document: { ...page, slug: 'checkout' } })
      ).status,
    ).toBe(422);
    expect(
      (await root.agent.post(`${base}/pages`).send({ key: 'about', document: page })).status,
    ).toBe(201);
    expect(
      (await root.agent.post(`${base}/pages`).send({ key: 'another-about', document: page }))
        .status,
    ).toBe(409);
    expect(
      (
        await root.agent.post(`${base}/banners`).send({
          key: 'path-traversal',
          document: { title: 'Banner', imageKey: '../outside.png' },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await root.agent.post(`${base}/banners`).send({
          key: 'missing-media',
          document: { title: 'Banner', imageKey: 'cms/missing.png' },
        })
      ).status,
    ).toBe(400);
  });

  it('persists separate draft/published featured order and filters ineligible events', async () => {
    const operational = await admin('ADMIN');
    const setup = await setupPublishedEvent(app);
    const second = await createEvent(setup.organizer.agent, setup.category.id, {
      title: 'Acara kedua',
      startsInDays: 14,
    });
    await prisma.event.update({
      where: { id: second.event.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    const draft = await createEvent(setup.organizer.agent, setup.category.id);
    expect(
      (
        await operational.agent
          .post(`${base}/sections`)
          .send({ key: 'events-for-you', document: { ...section, eventIds: [draft.event.id] } })
      ).status,
    ).toBe(400);
    const eventIds = [second.event.id, setup.event.id];
    const created = await operational.agent
      .post(`${base}/sections`)
      .send({ key: 'events-for-you', document: { ...section, eventIds } });
    expect(created.status).toBe(201);
    const id = created.body.data.item.id;
    expect((await publicSite()).sections).toHaveLength(0);
    expect(
      (await operational.agent.post(`${base}/sections/${id}/publish`).send({ expectedVersion: 1 }))
        .status,
    ).toBe(200);
    expect(
      (await publicSite()).sections[0].events.map((event: { id: string }) => event.id),
    ).toEqual(eventIds);
    expect(
      (
        await operational.agent
          .patch(`${base}/sections/${id}`)
          .send({ document: { ...section, eventIds: [...eventIds].reverse() }, expectedVersion: 2 })
      ).status,
    ).toBe(200);
    const rows = await prisma.featuredEvent.findMany({
      where: { sectionId: id },
      orderBy: { sortOrder: 'asc' },
    });
    expect(rows.filter((row) => row.stage === 'DRAFT').map((row) => row.eventId)).toEqual(
      [...eventIds].reverse(),
    );
    expect(rows.filter((row) => row.stage === 'PUBLISHED').map((row) => row.eventId)).toEqual(
      eventIds,
    );
    expect(
      (await publicSite()).sections[0].events.map((event: { id: string }) => event.id),
    ).toEqual(eventIds);
    expect(
      (await operational.agent.get(`${base}/preview`)).body.data.sections[0].events.map(
        (event: { id: string }) => event.id,
      ),
    ).toEqual([...eventIds].reverse());
    await prisma.event.update({ where: { id: setup.event.id }, data: { status: 'CANCELLED' } });
    expect(
      (await publicSite()).sections[0].events.map((event: { id: string }) => event.id),
    ).toEqual([second.event.id]);
    const eligible = await operational.agent
      .get(`${base}/events`)
      .query({ ids: [setup.event.id, second.event.id, draft.event.id].join(',') });
    expect(eligible.body.data.events.map((event: { id: string }) => event.id)).toEqual([
      second.event.id,
    ]);
    expect(eligible.body.data.events[0]).toMatchObject({
      organizer: { organizationName: 'Organizer Uji' },
      category: { name: 'Musik' },
      city: 'Jakarta',
      status: 'PUBLISHED',
    });
    expect(
      (await operational.agent.post(`${base}/sections/${id}/publish`).send({ expectedVersion: 3 }))
        .status,
    ).toBe(400);
  });

  it('keeps Admin preview isolated from unpublished global configuration', async () => {
    const root = await admin();
    const operational = await admin('ADMIN');
    const saved = await root.agent
      .post(`${base}/settings`)
      .send({ key: 'general', document: { websiteName: 'Published GOFEST' } });
    const settingsId = saved.body.data.item.id;
    await root.agent.post(`${base}/settings/${settingsId}/publish`).send({ expectedVersion: 1 });
    await root.agent
      .patch(`${base}/settings/${settingsId}`)
      .send({ document: { websiteName: 'Confidential draft' }, expectedVersion: 2 });
    await root.agent.post(`${base}/pages`).send({ key: 'about', document: page });
    const featured = await operational.agent
      .post(`${base}/sections`)
      .send({ key: 'events-for-you', document: section });
    expect(featured.status).toBe(201);
    const preview = await operational.agent.get(`${base}/preview`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.settings.websiteName).toBe('Published GOFEST');
    expect(preview.body.data.sections[0].title).toBe(section.title);
    expect(preview.body.data.pages).toHaveLength(0);
    expect((await root.agent.get(`${base}/preview`)).body.data.settings.websiteName).toBe(
      'Confidential draft',
    );
  });

  it('publishes maintenance and branding while keeping login and dashboard available', async () => {
    const root = await admin();
    const saved = await root.agent.post(`${base}/settings`).send({
      key: 'general',
      document: {
        websiteName: 'GOFEST Uji',
        maintenance: true,
        maintenanceMessage: 'Kami memperbarui layanan.',
        primaryColor: '#0052CC',
        footerDescription: 'Footer uji',
      },
    });
    expect(saved.status).toBe(201);
    const id = saved.body.data.item.id;
    expect((await publicSite()).settings.maintenance).toBe(false);
    expect(
      (await root.agent.post(`${base}/settings/${id}/publish`).send({ expectedVersion: 1 })).status,
    ).toBe(200);
    expect((await publicSite()).settings).toMatchObject({
      websiteName: 'GOFEST Uji',
      maintenance: true,
      maintenanceMessage: 'Kami memperbarui layanan.',
      primaryColor: '#0052CC',
      footerDescription: 'Footer uji',
    });
    expect((await root.agent.get(`${base}/overview`)).body.data.websiteStatus).toBe('MAINTENANCE');
    expect((await root.agent.get('/api/v1/admin/dashboard')).status).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: root.email, password: PASSWORD })
      ).status,
    ).toBe(200);
    expect(
      (
        await root.agent
          .patch(`${base}/settings/${id}`)
          .send({ document: { websiteName: 'GOFEST Uji', maintenance: false }, expectedVersion: 2 })
      ).status,
    ).toBe(200);
    expect((await publicSite()).settings.maintenance).toBe(true);
    expect(
      (await root.agent.post(`${base}/settings/${id}/publish`).send({ expectedVersion: 3 })).status,
    ).toBe(200);
    expect((await publicSite()).settings.maintenance).toBe(false);
    expect((await root.agent.delete(`${base}/settings/${id}`)).status).toBe(400);
  });

  it('requires uploaded banner media and publishes real navigation and image metadata', async () => {
    const root = await admin();
    const empty = await root.agent
      .post(`${base}/banners`)
      .send({ key: 'empty', document: { title: 'Belum ada gambar' } });
    expect(empty.status).toBe(201);
    expect(
      (
        await root.agent
          .post(`${base}/banners/${empty.body.data.item.id}/publish`)
          .send({ expectedVersion: 1 })
      ).status,
    ).toBe(400);
    const image = await sharp({
      create: { width: 600, height: 200, channels: 3, background: '#0052CC' },
    })
      .png()
      .toBuffer();
    const upload = await root.agent
      .post('/api/v1/uploads')
      .field('folder', 'cms')
      .attach('file', image, { filename: 'banner.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);
    const key = upload.body.data.key;
    try {
      expect(await prisma.mediaAsset.findUnique({ where: { key } })).toMatchObject({
        ownerId: root.userId,
        folder: 'cms',
        width: 600,
        height: 200,
      });
      const banner = await root.agent.post(`${base}/banners`).send({
        key: 'promo',
        document: {
          title: 'Program minggu ini',
          imageKey: key,
          ctaText: 'Pilih acara',
          ctaUrl: '/events',
          sortOrder: 2,
        },
      });
      expect(banner.status).toBe(201);
      await root.agent
        .post(`${base}/banners/${banner.body.data.item.id}/publish`)
        .send({ expectedVersion: 1 });
      const navigation = await root.agent.post(`${base}/navigation`).send({
        key: 'events',
        document: { label: 'Cari acara', href: '/events', placement: 'HEADER', sortOrder: 1 },
      });
      expect(navigation.status).toBe(201);
      await root.agent
        .post(`${base}/navigation/${navigation.body.data.item.id}/publish`)
        .send({ expectedVersion: 1 });
      const site = await publicSite();
      expect(site.banners[0]).toMatchObject({
        title: 'Program minggu ini',
        imageKey: key,
        ctaUrl: '/events',
      });
      expect(site.navigation[0]).toMatchObject({
        label: 'Cari acara',
        href: '/events',
        placement: 'HEADER',
      });
      expect(
        (await root.agent.delete(`${base}/navigation/${navigation.body.data.item.id}`)).status,
      ).toBe(200);
      expect((await publicSite()).navigation).toHaveLength(0);
      const overview = await root.agent.get(`${base}/overview`);
      expect(overview.body.data.counts).toMatchObject({ banners: 1 });
      expect(overview.body.data.activities.length).toBeGreaterThan(0);
    } finally {
      await removePublicObject(key);
    }
  });
  it('serializes competing page slugs and requires a draft edit version', async () => {
    const root = await admin();
    const responses = await Promise.all([
      root.agent.post(`${base}/pages`).send({ key: 'about-a', document: page }),
      root.agent.post(`${base}/pages`).send({ key: 'about-b', document: page }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const saved = responses.find((response) => response.status === 201)!.body.data.item;
    expect(
      (
        await root.agent
          .patch(`${base}/pages/${saved.id}`)
          .send({ document: { ...page, title: 'No version' } })
      ).status,
    ).toBe(400);
    expect(
      (
        await root.agent
          .patch(`${base}/pages/${saved.id}`)
          .send({ expectedVersion: 1, document: { ...page, title: 'Versioned' } })
      ).status,
    ).toBe(200);
  });
  it('rejects dead navigation paths but accepts an existing CMS page destination', async () => {
    const root = await admin();
    const document = { label: 'Informasi', href: '/missing-information', placement: 'HEADER' };
    expect(
      (await root.agent.post(`${base}/navigation`).send({ key: 'bad-link', document })).status,
    ).toBe(400);
    await root.agent.post(`${base}/pages`).send({ key: 'about', document: page });
    expect(
      (
        await root.agent
          .post(`${base}/navigation`)
          .send({ key: 'about-link', document: { ...document, href: '/pages/tentang-kami' } })
      ).status,
    ).toBe(201);
  });
});
