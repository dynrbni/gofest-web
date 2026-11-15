import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { createEventInput, setupOrganizer } from '../helpers';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../prisma/migrations/20261116000000_expand_event_categories/migration.sql',
  ),
  'utf8',
);
const addedSlugs = ['religi', 'olahraga', 'pameran', 'wisata', 'talkshow', 'kompetisi', 'kuliner'];
const app = createApp();

describe('expanded event categories', () => {
  it('adds missing categories once and preserves existing names, IDs and inactive settings', async () => {
    const existing = await prisma.eventCategory.create({
      data: { name: 'Kajian pilihan', slug: 'religi', isActive: false },
    });
    await prisma.$executeRawUnsafe(migration);
    await prisma.$executeRawUnsafe(migration);

    expect(await prisma.eventCategory.count()).toBe(addedSlugs.length);
    expect(await prisma.eventCategory.findUnique({ where: { slug: 'religi' } })).toEqual(existing);
    const response = await request(app).get('/api/v1/categories');
    expect(response.status).toBe(200);
    expect(
      response.body.data.categories.map((category: { slug: string }) => category.slug).sort(),
    ).toEqual(addedSlugs.filter((slug) => slug !== 'religi').sort());
    expect(
      response.body.data.categories.every(
        (category: { eventCount: number }) => category.eventCount === 0,
      ),
    ).toBe(true);
  });

  it('uses the new categories for real event assignments and category filtering', async () => {
    await prisma.$executeRawUnsafe(migration);
    const organizer = await setupOrganizer(app);
    const categories = await prisma.eventCategory.findMany({
      where: { slug: { in: ['religi', 'olahraga'] } },
    });
    for (const category of categories) {
      await prisma.event.create({
        data: {
          ...createEventInput(category.id, { title: `Acara ${category.name}` }),
          organizerId: organizer.organizerId,
          status: 'PUBLISHED',
        },
      });
    }
    for (const category of categories) {
      const response = await request(app).get('/api/v1/events').query({ category: category.slug });
      expect(response.status).toBe(200);
      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].title).toBe(`Acara ${category.name}`);
    }
  });
});
