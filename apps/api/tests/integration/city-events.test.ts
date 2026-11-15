import { EVENT_CITIES } from '@gofest/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { createEventInput, seedCategory, setupOrganizer } from '../helpers';

const app = createApp();

describe('dedicated city event listings', () => {
  it('matches city aliases exactly and excludes online, neighboring, unpublished and ended events', async () => {
    const organizer = await setupOrganizer(app);
    const category = await seedCategory();
    for (const city of EVENT_CITIES) {
      for (const alias of city.aliases) {
        await prisma.event.create({
          data: {
            ...createEventInput(category.id, { title: alias }),
            city: ` ${alias.toUpperCase()} `,
            organizerId: organizer.organizerId,
            status: 'PUBLISHED',
          },
        });
      }
    }
    for (const city of [
      'Bekasi',
      'Bogor',
      'Tangerang',
      'Kabupaten Bandung',
      'Bandung Barat',
      'Bali',
      'Badung',
      'DI Yogyakarta',
      'Jakarta palsu',
      'Denpasar palsu',
    ]) {
      await prisma.event.create({
        data: {
          ...createEventInput(category.id),
          city,
          organizerId: organizer.organizerId,
          status: 'PUBLISHED',
        },
      });
    }
    for (const scenario of [
      { type: 'ONLINE' as const, status: 'PUBLISHED' as const, startsInDays: 7 },
      { type: 'OFFLINE' as const, status: 'DRAFT' as const, startsInDays: 7 },
      { type: 'OFFLINE' as const, status: 'CANCELLED' as const, startsInDays: 7 },
      { type: 'OFFLINE' as const, status: 'PUBLISHED' as const, startsInDays: -7 },
    ]) {
      await prisma.event.create({
        data: {
          ...createEventInput(category.id, scenario),
          salesStartAt: new Date(Date.now() - 30 * 86_400_000),
          city: 'Jakarta',
          status: scenario.status,
          organizerId: organizer.organizerId,
        },
      });
    }

    for (const city of EVENT_CITIES) {
      const response = await request(app).get('/api/v1/events').query({
        citySlug: city.slug,
        limit: 50,
        city: 'Bogor',
      });
      expect(response.status).toBe(200);
      expect(response.body.meta.total).toBe(city.aliases.length);
      expect(response.body.data.map((event: { title: string }) => event.title).sort()).toEqual(
        [...city.aliases].sort(),
      );
      expect(response.body.data.every((event: { type: string }) => event.type === 'OFFLINE')).toBe(
        true,
      );
    }
  });

  it('keeps the city scope and totals across pagination', async () => {
    const organizer = await setupOrganizer(app);
    const category = await seedCategory();
    await prisma.event.createMany({
      data: Array.from({ length: 15 }, (_, index) => ({
        ...createEventInput(category.id, { title: `Acara ${index}`, startsInDays: index + 1 }),
        city: index < 13 ? 'Jakarta Selatan' : 'Bandung',
        organizerId: organizer.organizerId,
        status: 'PUBLISHED' as const,
      })),
    });
    const seen = new Set<string>();
    for (const page of [1, 2]) {
      const response = await request(app)
        .get('/api/v1/events')
        .query({ citySlug: 'jakarta', page, limit: 12 });
      expect(response.status).toBe(200);
      expect(response.body.meta).toMatchObject({ total: 13, totalPages: 2, page });
      expect(response.body.data).toHaveLength(page === 1 ? 12 : 1);
      for (const event of response.body.data) {
        expect(event.city).toBe('Jakarta Selatan');
        expect(seen.has(event.id)).toBe(false);
        seen.add(event.id);
      }
    }
    expect(seen.size).toBe(13);
  });

  it('returns an empty list for a city without events and rejects unknown city slugs', async () => {
    const empty = await request(app).get('/api/v1/events?citySlug=denpasar');
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta.total).toBe(0);
    for (const citySlug of ['unknown', 'jak%', "jakarta' OR 1=1 --"]) {
      expect((await request(app).get('/api/v1/events').query({ citySlug })).status).toBe(422);
    }
  });
});
