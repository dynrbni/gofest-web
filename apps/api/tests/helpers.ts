import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../src/lib/prisma';

let counter = 0;

export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export function uniqueSlug(prefix = 'event') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export const PASSWORD = 'Rahasia123';

export async function registerAgent(app: Express, email = uniqueEmail()) {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/register').send({
    name: 'Pengguna Uji',
    email,
    phone: '081234567890',
    password: PASSWORD,
  });
  if (response.status !== 201) {
    throw new Error(`Register gagal: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { agent, email, userId: response.body.data.user.id as string };
}

export async function setupOrganizer(app: Express, name = 'Organizer Uji') {
  const email = uniqueEmail('organizer');
  const { agent, userId } = await registerAgent(app, email);
  const slug = uniqueSlug('organizer');
  const response = await agent.post('/api/v1/organizer/account/apply').send({
    organizationName: name,
    slug,
    description: 'Organizer yang menguji alur event dan penjualan tiket.',
  });
  if (response.status !== 201) {
    throw new Error(`Apply organizer gagal: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const organizerId = response.body.data.organizer.id as string;
  await prisma.organizerProfile.update({
    where: { id: organizerId },
    data: { status: 'ACTIVE' },
  });
  return { agent, email, userId, organizerId, slug };
}

export async function seedCategory(name = 'Musik') {
  return prisma.eventCategory.create({
    data: {
      name,
      slug: uniqueSlug('kategori'),
      description: 'Kategori untuk pengujian.',
      isActive: true,
    },
  });
}

interface EventOptions {
  type?: 'ONLINE' | 'OFFLINE';
  title?: string;
  startsInDays?: number;
}

export function createEventInput(categoryId: string, options: EventOptions = {}) {
  const startsAt = new Date(Date.now() + (options.startsInDays ?? 7) * 86_400_000);
  const endsAt = new Date(startsAt.getTime() + 3 * 3_600_000);
  const salesEndAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const type = options.type ?? 'OFFLINE';
  return {
    title: options.title ?? 'Konser Malam Terang',
    slug: uniqueSlug('konser'),
    summary: 'Konser intimate dengan tata suara yang dirancang untuk ruang kecil.',
    description:
      'Malam ini diisi oleh musisi yang sedang mengerjakan album baru. Pintu dibuka satu jam sebelum pertunjukan dan tidak ada tiket fisik di lokasi.',
    categoryId,
    type,
    venueName: type === 'OFFLINE' ? 'Studio Bumi' : null,
    address: type === 'OFFLINE' ? 'Jl. Cikini Raya No. 42' : null,
    city: type === 'OFFLINE' ? 'Jakarta' : null,
    onlineAccessUrl: type === 'ONLINE' ? 'https://stream.example.com/gofest' : null,
    onlineAccessNote: type === 'ONLINE' ? 'Tautan dikirim setelah pembayaran.' : null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    timezone: 'Asia/Jakarta',
    salesStartAt: new Date(Date.now() - 86_400_000).toISOString(),
    salesEndAt: salesEndAt.toISOString(),
    rules: 'Dilarang membawa minuman dari luar. Usia minimal 17 tahun.',
    refundPolicy: 'Tiket dapat dikembalikan hingga 7 hari sebelum acara.',
  };
}

export async function createEvent(
  agent: ReturnType<typeof request.agent>,
  categoryId: string,
  options: EventOptions = {},
) {
  const input = createEventInput(categoryId, options);
  const response = await agent.post('/api/v1/organizer/events').send(input);
  if (response.status !== 201) {
    throw new Error(`Create event gagal: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { event: response.body.data.event, input };
}

export async function addTicketType(
  agent: ReturnType<typeof request.agent>,
  eventId: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await agent
    .post(`/api/v1/organizer/events/${eventId}/ticket-types`)
    .send({
      name: 'Tiket Reguler',
      description: 'Akses masuk area utama.',
      price: 150_000,
      quotaTotal: 50,
      minPerOrder: 1,
      maxPerOrder: 5,
      isActive: true,
      sortOrder: 0,
      ...overrides,
    });
  if (response.status !== 201) {
    throw new Error(
      `Create ticket type gagal: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
  return response.body.data.ticketType;
}

export async function publishEvent(eventId: string) {
  return prisma.event.update({
    where: { id: eventId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}

export async function setupPublishedEvent(app: Express, ticketOverrides: Record<string, unknown> = {}) {
  const organizer = await setupOrganizer(app);
  const category = await seedCategory();
  const { event } = await createEvent(organizer.agent, category.id);
  const ticketType = await addTicketType(organizer.agent, event.id, ticketOverrides);
  await publishEvent(event.id);
  return { organizer, category, event, ticketType };
}
