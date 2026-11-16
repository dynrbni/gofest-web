import request from 'supertest';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { removePublicObject } from '../../src/lib/storage';
import {
  createEventInput,
  PASSWORD,
  registerAgent,
  seedCategory,
  setupOrganizer,
} from '../helpers';

const app = createApp();
const image = () =>
  sharp({ create: { width: 240, height: 80, channels: 3, background: '#0052cc' } })
    .png()
    .toBuffer();

async function upload(agent: ReturnType<typeof request.agent>, folder: string) {
  const result = await agent
    .post('/api/v1/uploads')
    .field('folder', folder)
    .attach('file', await image(), { filename: 'image.png', contentType: 'image/png' });
  expect(result.status).toBe(201);
  return result.body.data as {
    key: string;
    url: string;
    id: string;
    width: number;
    height: number;
  };
}

describe('persisted image uploads and profiles', () => {
  it('checks MIME, signature, decoded images, size and upload permissions', async () => {
    const account = await registerAgent(app);
    expect(
      (
        await request(app)
          .post('/api/v1/uploads')
          .attach('file', await image(), 'image.png')
      ).status,
    ).toBe(401);
    const fake = await account.agent
      .post('/api/v1/uploads')
      .field('folder', 'avatars')
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(fake.status).toBe(400);
    const mismatch = await account.agent
      .post('/api/v1/uploads')
      .field('folder', 'avatars')
      .attach('file', await image(), { filename: 'image.jpg', contentType: 'image/jpeg' });
    expect(mismatch.status).toBe(400);
    const large = await account.agent
      .post('/api/v1/uploads')
      .field('folder', 'avatars')
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(large.status).toBe(400);
    const oversizedBanner = await account.agent
      .post('/api/v1/uploads')
      .field('folder', 'avatars')
      .attach('file', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(oversizedBanner.status).toBe(400);
    expect(
      (
        await account.agent
          .post('/api/v1/uploads')
          .field('folder', 'cms')
          .attach('file', await image(), 'image.png')
      ).status,
    ).toBe(403);
    expect(
      (
        await account.agent
          .post('/api/v1/uploads')
          .field('folder', 'events')
          .attach('file', await image(), 'image.png')
      ).status,
    ).toBe(403);
    expect(await prisma.mediaAsset.count()).toBe(0);
  });

  it('persists avatars through logout/login, rejects another account image and clears the avatar', async () => {
    const account = await registerAgent(app);
    const other = await registerAgent(app);
    const stored = await upload(account.agent, 'avatars');
    try {
      const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: stored.id } });
      expect(asset).toMatchObject({
        ownerId: account.userId,
        folder: 'avatars',
        mimeType: 'image/webp',
        originalName: 'image.png',
        width: 240,
        height: 80,
      });
      expect(asset.byteSize).toBeGreaterThan(0);
      const outsider = await other.agent
        .patch('/api/v1/auth/profile')
        .send({ name: 'Orang Lain', avatarKey: stored.key });
      expect(outsider.status).toBe(403);
      const saved = await account.agent
        .patch('/api/v1/auth/profile')
        .send({ name: 'Kreator Foto', avatarKey: stored.key });
      expect(saved.status).toBe(200);
      expect(saved.body.data.user.avatarKey).toBe(stored.key);
      await account.agent.post('/api/v1/auth/logout');
      const login = await account.agent
        .post('/api/v1/auth/login')
        .send({ email: account.email, password: PASSWORD });
      expect(login.body.data.user.avatarKey).toBe(stored.key);
      expect((await account.agent.get('/api/v1/auth/me')).body.data.user.avatarKey).toBe(
        stored.key,
      );
      expect(
        (
          await account.agent
            .patch('/api/v1/auth/profile')
            .send({ name: 'Kreator Foto', avatarKey: null })
        ).status,
      ).toBe(200);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: account.userId } })).avatarKey,
      ).toBeNull();
    } finally {
      await removePublicObject(stored.key);
    }
  });

  it('links owner media to an event, keeps it on reopen, exposes public cover and rejects cross-organizer edits', async () => {
    const owner = await setupOrganizer(app);
    const other = await setupOrganizer(app);
    const category = await seedCategory();
    const stored = await upload(owner.agent, 'events');
    try {
      const data = { ...createEventInput(category.id), coverKey: stored.key };
      const denied = await other.agent.post('/api/v1/organizer/events').send(data);
      expect(denied.status).toBe(403);
      const created = await owner.agent.post('/api/v1/organizer/events').send(data);
      expect(created.status).toBe(201);
      const event = created.body.data.event;
      expect(
        (await owner.agent.get(`/api/v1/organizer/events/${event.id}`)).body.data.event.coverKey,
      ).toBe(stored.key);
      expect(
        (await other.agent.patch(`/api/v1/organizer/events/${event.id}`).send({ coverKey: null }))
          .status,
      ).toBe(403);
      await prisma.event.update({ where: { id: event.id }, data: { status: 'PUBLISHED' } });
      expect(
        (await request(app).get(`/api/v1/events/${event.slug}`)).body.data.event.coverKey,
      ).toBe(stored.key);
      expect((await request(app).get(stored.url)).status).toBe(200);
    } finally {
      await removePublicObject(stored.key);
    }
  });

  it('publishes organizer contact/banner changes and prevents foreign media or unsafe social URLs', async () => {
    const owner = await setupOrganizer(app);
    const other = await setupOrganizer(app);
    const stored = await upload(owner.agent, 'organizers');
    try {
      expect(
        (
          await other.agent
            .patch('/api/v1/organizer/account/profile')
            .send({ bannerKey: stored.key })
        ).status,
      ).toBe(403);
      expect(
        (
          await owner.agent
            .patch('/api/v1/organizer/account/profile')
            .send({ websiteUrl: 'javascript:alert(1)' })
        ).status,
      ).toBe(422);
      const update = {
        bannerKey: stored.key,
        logoKey: stored.key,
        contactEmail: 'hello@example.com',
        contactPhone: '+628123456789',
        location: 'Jakarta',
        websiteUrl: 'https://example.com',
        instagramUrl: 'https://instagram.com/gofest',
        tiktokUrl: 'https://tiktok.com/@gofest',
      };
      expect(
        (await owner.agent.patch('/api/v1/organizer/account/profile').send(update)).status,
      ).toBe(200);
      expect(
        (await request(app).get(`/api/v1/organizers/${owner.slug}`)).body.data.organizer,
      ).toMatchObject(update);
      expect(
        (await owner.agent.patch('/api/v1/organizer/account/profile').send({ bannerKey: null }))
          .status,
      ).toBe(200);
      expect(
        (await request(app).get(`/api/v1/organizers/${owner.slug}`)).body.data.organizer.bannerKey,
      ).toBeNull();
    } finally {
      await removePublicObject(stored.key);
    }
  });
});
