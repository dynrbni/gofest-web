import type { EventStatus } from '@prisma/client';
import request from 'supertest';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { removePublicObject } from '../../src/lib/storage';
import { createEventInput, seedCategory, setupOrganizer } from '../helpers';

const app = createApp();

describe('public creator profiles', () => {
  it('separates ongoing, upcoming and past events without exposing unpublished events or owner data', async () => {
    const organizer = await setupOrganizer(app);
    const category = await seedCategory();
    const scenarios: Array<[string, EventStatus, number]> = [
      ['Ongoing', 'PUBLISHED', -0.04],
      ['Upcoming', 'PUBLISHED', 7],
      ['Ended', 'PUBLISHED', -7],
      ['Completed', 'COMPLETED', 3],
      ['Draft', 'DRAFT', 30],
      ['Review', 'PENDING_REVIEW', 30],
      ['Cancelled', 'CANCELLED', 30],
    ];
    for (const [title, status, startsInDays] of scenarios) {
      await prisma.event.create({
        data: {
          ...createEventInput(category.id, { title, startsInDays }),
          salesStartAt: new Date(Date.now() - 60 * 86_400_000),
          organizerId: organizer.organizerId,
          status,
          coverKey: `${title}.webp`,
        },
      });
    }
    const active = await request(app).get(`/api/v1/organizers/${organizer.slug}`);
    expect(active.status).toBe(200);
    const profile = active.body.data.organizer;
    expect(profile.eventCounts).toEqual({ active: 2, past: 2, total: 4 });
    expect(profile.events.map((event: { title: string }) => event.title)).toEqual([
      'Ongoing',
      'Upcoming',
    ]);
    expect(profile.fallbackBannerKey).toBe('Upcoming.webp');
    expect(profile.createdAt).toBeTruthy();
    expect(profile).not.toHaveProperty('userId');
    expect(profile).not.toHaveProperty('user');
    expect(profile.events[0]).not.toHaveProperty('onlineAccessUrl');
    const past = await request(app).get(`/api/v1/organizers/${organizer.slug}?period=past`);
    expect(past.status).toBe(200);
    expect(past.body.data.organizer.events.map((event: { title: string }) => event.title)).toEqual([
      'Completed',
      'Ended',
    ]);
    expect(past.body.data.organizer.eventCounts).toEqual(profile.eventCounts);
  });

  it('paginates the full history, clamps excessive pages and rejects invalid filters', async () => {
    const organizer = await setupOrganizer(app);
    const category = await seedCategory();
    await prisma.event.createMany({
      data: Array.from({ length: 27 }, (_, index) => ({
        ...createEventInput(category.id, { title: `Event ${index}`, startsInDays: -index - 1 }),
        salesStartAt: new Date(Date.now() - 60 * 86_400_000),
        organizerId: organizer.organizerId,
        status: 'PUBLISHED' as const,
      })),
    });
    const response = await request(app).get(
      `/api/v1/organizers/${organizer.slug}?period=past&page=999`,
    );
    expect(response.status).toBe(200);
    const profile = response.body.data.organizer;
    expect(profile.eventCounts).toEqual({ active: 0, past: 27, total: 27 });
    expect(profile.eventsPagination).toEqual({
      page: 3,
      limit: 12,
      total: 27,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(profile.events.map((event: { title: string }) => event.title)).toEqual([
      'Event 24',
      'Event 25',
      'Event 26',
    ]);
    for (const query of ['period=draft', 'page=0', 'limit=25', 'page=1.5']) {
      const invalid = await request(app).get(`/api/v1/organizers/${organizer.slug}?${query}`);
      expect(invalid.status).toBe(422);
    }
  });

  it('returns an empty active profile and hides inactive creators', async () => {
    const organizer = await setupOrganizer(app);
    const response = await request(app).get(`/api/v1/organizers/${organizer.slug}`);
    expect(response.status).toBe(200);
    expect(response.body.data.organizer.eventCounts).toEqual({ active: 0, past: 0, total: 0 });
    expect(response.body.data.organizer.events).toEqual([]);
    expect(response.body.data.organizer.fallbackBannerKey).toBeNull();
    for (const status of ['PENDING', 'SUSPENDED', 'REJECTED'] as const) {
      await prisma.organizerProfile.update({
        where: { id: organizer.organizerId },
        data: { status },
      });
      expect((await request(app).get(`/api/v1/organizers/${organizer.slug}`)).status).toBe(404);
    }
  });

  it('uploads, saves and clears creator artwork through the authenticated profile', async () => {
    const organizer = await setupOrganizer(app);
    const keys: string[] = [];
    try {
      const image = await sharp({
        create: { width: 140, height: 40, channels: 3, background: '#0052cc' },
      })
        .png()
        .toBuffer();
      for (const filename of ['creator-logo.png', 'creator-banner.png']) {
        const uploaded = await organizer.agent
          .post('/api/v1/uploads')
          .field('folder', 'organizers')
          .attach('file', image, filename);
        expect(uploaded.status).toBe(201);
        keys.push(uploaded.body.data.key);
      }
      const artwork = { logoKey: keys[0], bannerKey: keys[1] };
      const saved = await organizer.agent.patch('/api/v1/organizer/account/profile').send(artwork);
      expect(saved.status).toBe(200);
      const profile = await request(app).get(`/api/v1/organizers/${organizer.slug}`);
      expect(profile.body.data.organizer).toMatchObject(artwork);
      expect(
        (await request(app).patch('/api/v1/organizer/account/profile').send(artwork)).status,
      ).toBe(401);
      const cleared = await organizer.agent
        .patch('/api/v1/organizer/account/profile')
        .send({ logoKey: null, bannerKey: null });
      expect(cleared.status).toBe(200);
      const empty = await request(app).get(`/api/v1/organizers/${organizer.slug}`);
      expect(empty.body.data.organizer).toMatchObject({ logoKey: null, bannerKey: null });
    } finally {
      await Promise.all(keys.map(removePublicObject));
    }
  });
});
