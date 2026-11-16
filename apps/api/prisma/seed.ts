import '../src/config/env';
import sharp from 'sharp';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import { storePublicImage } from '../src/lib/storage';
import { env } from '../src/config/env';
import { seedDashboard } from './dashboard.seed';

interface SeedTicket {
  name: string;
  price: number;
  quotaTotal: number;
}

interface SeedCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscount: number | null;
}

interface SeedEvent {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  type: 'ONLINE' | 'OFFLINE';
  venueName?: string;
  address?: string;
  city?: string;
  onlineAccessUrl?: string;
  onlineAccessNote?: string;
  startsAt: Date;
  endsAt: Date;
  rules: string;
  refundPolicy: string;
  tickets: SeedTicket[];
  coupon: SeedCoupon | null;
}

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.gofest.local';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminDemo123!';
const organizerEmail = process.env.SEED_ORGANIZER_EMAIL ?? 'organizer@demo.gofest.local';
const organizerPassword = process.env.SEED_ORGANIZER_PASSWORD ?? 'OrganizerDemo123!';
const staffEmail = process.env.SEED_STAFF_EMAIL ?? 'staff@demo.gofest.local';
const staffPassword = process.env.SEED_STAFF_PASSWORD ?? 'StaffDemo123!';

function daysFromNow(days: number, hour = 19) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

function posterSvg(index: number) {
  const palettes = [
    { background: '#e8ddc9', ink: '#191b1a', accent: '#d9573f', second: '#65735d' },
    { background: '#dcd6c7', ink: '#1f2522', accent: '#b8432c', second: '#3f4a44' },
    { background: '#efe6d6', ink: '#191b1a', accent: '#c98a3d', second: '#58665f' },
    { background: '#e3dfd2', ink: '#191b1a', accent: '#8c4b3e', second: '#6f7a63' },
  ];
  const palette = palettes[index % palettes.length]!;
  return `
    <svg width="1200" height="1600" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1600" fill="${palette.background}"/>
      <circle cx="${280 + index * 90}" cy="${360 + index * 40}" r="${180 + index * 20}" fill="${palette.accent}" opacity="0.92"/>
      <rect x="${690 - index * 30}" y="${240 + index * 50}" width="330" height="620" fill="${palette.second}" opacity="0.85"/>
      <path d="M0 ${1120 + index * 30} L420 ${960 + index * 20} L780 ${1180 - index * 20} L1200 ${1010 + index * 10} L1200 1600 L0 1600 Z" fill="${palette.ink}"/>
      <circle cx="${900 - index * 40}" cy="${880 + index * 20}" r="74" fill="${palette.background}"/>
      <rect x="86" y="${1240 + index * 15}" width="${420 + index * 40}" height="10" fill="${palette.background}" opacity="0.6"/>
    </svg>
  `;
}

async function main() {
  if (env.isProduction) {
    throw new Error('Seed demo tidak boleh dijalankan di production.');
  }

  console.log('Menyiapkan data demo Gofest. Semua event ditandai isDemo=true.');

  const [adminHash, organizerHash, staffHash] = await Promise.all([
    hashPassword(adminPassword),
    hashPassword(organizerPassword),
    hashPassword(staffPassword),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Admin Demo', role: 'ADMIN', status: 'ACTIVE' },
    create: {
      name: 'Admin Demo',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: organizerEmail },
    update: { name: 'Nadia Prameswari', status: 'ACTIVE' },
    create: {
      name: 'Nadia Prameswari',
      email: organizerEmail,
      phone: '081200000001',
      passwordHash: organizerHash,
      status: 'ACTIVE',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: staffEmail },
    update: { name: 'Raka Mahendra', status: 'ACTIVE' },
    create: {
      name: 'Raka Mahendra',
      email: staffEmail,
      phone: '081200000002',
      passwordHash: staffHash,
      status: 'ACTIVE',
    },
  });

  const profile = await prisma.organizerProfile.upsert({
    where: { userId: organizer.id },
    update: {
      organizationName: 'Ruang Rekam',
      status: 'ACTIVE',
      description:
        'Ruang Rekam mengkurasi pertunjukan musik, film, dan kelas kecil di kota-kota yang jarang disinggahi tur besar.',
      reviewedByUserId: admin.id,
      reviewedAt: new Date(),
    },
    create: {
      userId: organizer.id,
      organizationName: 'Ruang Rekam',
      slug: 'ruang-rekam',
      description:
        'Ruang Rekam mengkurasi pertunjukan musik, film, dan kelas kecil di kota-kota yang jarang disinggahi tur besar.',
      status: 'ACTIVE',
      reviewedByUserId: admin.id,
      reviewedAt: new Date(),
    },
  });

  const categorySeeds = [
    { name: 'Musik', slug: 'musik', description: 'Konser, showcase, dan dengar bersama.' },
    { name: 'Film', slug: 'film', description: 'Pemutaran dan diskusi film.' },
    { name: 'Workshop', slug: 'workshop', description: 'Kelas praktik dengan peserta terbatas.' },
    { name: 'Komunitas', slug: 'komunitas', description: 'Pertemuan dan ruang belajar bersama.' },
    {
      name: 'Seni Pertunjukan',
      slug: 'seni-pertunjukan',
      description: 'Teater, tari, dan pertunjukan lintas disiplin.',
    },
    { name: 'Religi', slug: 'religi', description: 'Kajian, perayaan, dan pertemuan keagamaan.' },
    {
      name: 'Olahraga',
      slug: 'olahraga',
      description: 'Pertandingan, latihan, dan kegiatan olahraga.',
    },
    { name: 'Pameran', slug: 'pameran', description: 'Pameran seni, produk, dan karya kreatif.' },
    {
      name: 'Wisata',
      slug: 'wisata',
      description: 'Tur, perjalanan, dan pengalaman di destinasi wisata.',
    },
    { name: 'Talkshow', slug: 'talkshow', description: 'Diskusi dan bincang bersama narasumber.' },
    { name: 'Kompetisi', slug: 'kompetisi', description: 'Lomba dan kompetisi lintas bidang.' },
    {
      name: 'Kuliner',
      slug: 'kuliner',
      description: 'Festival makanan, bazar, dan pengalaman kuliner.',
    },
  ];
  const categories = new Map<string, string>();
  for (const category of categorySeeds) {
    const row = await prisma.eventCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, isActive: true },
      create: { ...category, isActive: true },
    });
    categories.set(category.slug, row.id);
  }

  const eventSeeds: SeedEvent[] = [
    {
      slug: 'suara-lembut-di-ruang-beton',
      title: 'Suara Lembut di Ruang Beton',
      summary: 'Konser akustik untuk ruang kecil, tanpa panggung tinggi dan tanpa jeda panjang.',
      description:
        'Empat musisi membawakan materi baru yang belum pernah direkam. Penonton duduk melingkar di lantai beton yang dilapisi karpet. Tidak ada layar besar; cahaya datang dari lampu meja yang dipindah mengikuti lagu.',
      category: 'musik',
      type: 'OFFLINE' as const,
      venueName: 'Studio Bumi',
      address: 'Jl. Cikini Raya No. 42',
      city: 'Jakarta',
      startsAt: daysFromNow(21, 19),
      endsAt: daysFromNow(21, 22),
      rules:
        'Usia 17 tahun ke atas. Tidak ada kursi bernomor; mohon datang 30 menit sebelum mulai.',
      refundPolicy: 'Tiket dapat dikembalikan hingga 7 hari sebelum acara melalui halaman order.',
      tickets: [
        { name: 'Masuk Umum', price: 175_000, quotaTotal: 80 },
        { name: 'Duduk Dekat', price: 260_000, quotaTotal: 24 },
      ],
      coupon: {
        code: 'RUANG10',
        discountType: 'PERCENTAGE' as const,
        discountValue: 10,
        maxDiscount: 30_000,
      },
    },
    {
      slug: 'malam-film-pendek-ruang-tunggu',
      title: 'Malam Film Pendek: Ruang Tunggu',
      summary: 'Enam film pendek tentang menunggu, berpindah, dan pulang ke tempat yang berubah.',
      description:
        'Pemutaran enam film pendek dari Asia Tenggara, dilanjutkan diskusi dengan dua sutradara. Ruang pemutaran berkapasitas kecil dan tidak ada penjualan tiket di lokasi.',
      category: 'film',
      type: 'OFFLINE' as const,
      venueName: 'Bioskop Majapahit',
      address: 'Jl. Majapahit No. 18',
      city: 'Bandung',
      startsAt: daysFromNow(35, 18),
      endsAt: daysFromNow(35, 21),
      rules:
        'Tidak ada makanan di dalam ruang pemutaran. Diskusi berlangsung dalam Bahasa Indonesia.',
      refundPolicy: 'Tiket dapat dikembalikan hingga 5 hari sebelum acara.',
      tickets: [{ name: 'Tiket Pemutaran', price: 85_000, quotaTotal: 60 }],
      coupon: {
        code: 'FILM15',
        discountType: 'FIXED_AMOUNT' as const,
        discountValue: 15_000,
        maxDiscount: null,
      },
    },
    {
      slug: 'kelas-menulis-lagu-dari-catatan-harian',
      title: 'Kelas Menulis Lagu: Dari Catatan Harian',
      summary: 'Kelas online tiga jam untuk mengubah catatan harian menjadi lirik yang jujur.',
      description:
        'Sesi daring dengan latihan menulis, mendengar, dan memberi umpan balik. Peserta menerima rekaman sesi dan lembar kerja setelah kelas berakhir.',
      category: 'workshop',
      type: 'ONLINE' as const,
      onlineAccessUrl: 'https://meet.example.com/gofest-menulis-lagu',
      onlineAccessNote: 'Tautan ruang kelas dikirim setelah pembayaran. Rekaman tersedia 7 hari.',
      startsAt: daysFromNow(14, 13),
      endsAt: daysFromNow(14, 16),
      rules: 'Kelas untuk usia 16 tahun ke atas. Siapkan buku catatan dan satu lagu favorit.',
      refundPolicy: 'Tiket dapat dikembalikan hingga 48 jam sebelum kelas.',
      tickets: [
        { name: 'Kelas Reguler', price: 120_000, quotaTotal: 40 },
        { name: 'Kelas + Umpan Balik', price: 200_000, quotaTotal: 12 },
      ],
      coupon: {
        code: 'TULIS20',
        discountType: 'PERCENTAGE' as const,
        discountValue: 20,
        maxDiscount: 25_000,
      },
    },
    {
      slug: 'dengar-bersama-arsip-suara',
      title: 'Dengar Bersama: Arsip Suara Kota',
      summary: 'Sesi mendengarkan rekaman lapangan dan cerita di balik suara kota pada 1990-an.',
      description:
        'Arsip suara yang dikumpulkan selama lima tahun diputar satu per satu. Setiap rekaman disertai catatan tentang tempat, waktu, dan orang yang merekamnya.',
      category: 'komunitas',
      type: 'OFFLINE' as const,
      venueName: 'Ruang Arsip Sonik',
      address: 'Jl. Suryodiningratan No. 7',
      city: 'Yogyakarta',
      startsAt: daysFromNow(42, 16),
      endsAt: daysFromNow(42, 18),
      rules: 'Kuota sangat terbatas agar ruang tetap tenang. Mohon tidak merekam sesi.',
      refundPolicy: 'Tiket tidak dapat dikembalikan, tetapi dapat dialihkan melalui organizer.',
      tickets: [{ name: 'Kursi Dengar', price: 50_000, quotaTotal: 18 }],
      coupon: null,
    },
  ];

  let coverIndex = 0;
  for (const seed of eventSeeds) {
    const existing = await prisma.event.findUnique({ where: { slug: seed.slug } });
    let coverKey = existing?.coverKey ?? null;
    if (!coverKey) {
      const png = await sharp(Buffer.from(posterSvg(coverIndex)))
        .png()
        .toBuffer();
      const stored = await storePublicImage(png, 'events');
      coverKey = stored.key;
    }
    coverIndex += 1;

    const data = {
      organizerId: profile.id,
      categoryId: categories.get(seed.category)!,
      title: seed.title,
      summary: seed.summary,
      description: seed.description,
      coverKey,
      type: seed.type,
      venueName: seed.venueName ?? null,
      address: seed.address ?? null,
      city: seed.city ?? null,
      onlineAccessUrl: seed.onlineAccessUrl ?? null,
      onlineAccessNote: seed.onlineAccessNote ?? null,
      startsAt: seed.startsAt,
      endsAt: seed.endsAt,
      timezone: 'Asia/Jakarta',
      salesStartAt: daysFromNow(-1, 9),
      salesEndAt: new Date(seed.startsAt.getTime() - 60 * 60 * 1000),
      rules: seed.rules,
      refundPolicy: seed.refundPolicy,
      status: 'PUBLISHED' as const,
      publishedAt: existing?.publishedAt ?? new Date(),
      isDemo: true,
    };

    const event = await prisma.event.upsert({
      where: { slug: seed.slug },
      update: data,
      create: { ...data, slug: seed.slug },
    });

    for (const ticket of seed.tickets) {
      const current = await prisma.ticketType.findFirst({
        where: { eventId: event.id, name: ticket.name },
      });
      const ticketData = {
        price: ticket.price,
        quotaTotal: ticket.quotaTotal,
        salesStartAt: data.salesStartAt,
        salesEndAt: data.salesEndAt,
        minPerOrder: 1,
        maxPerOrder: 4,
        isActive: true,
      };
      if (current) {
        await prisma.ticketType.update({ where: { id: current.id }, data: ticketData });
      } else {
        await prisma.ticketType.create({
          data: { eventId: event.id, name: ticket.name, ...ticketData },
        });
      }
    }

    if (seed.coupon) {
      await prisma.coupon.upsert({
        where: { eventId_code: { eventId: event.id, code: seed.coupon.code } },
        update: {
          discountType: seed.coupon.discountType,
          discountValue: seed.coupon.discountValue,
          maxDiscount: seed.coupon.maxDiscount,
          minimumPurchase: 0,
          maxPerUser: 2,
          isActive: true,
        },
        create: {
          eventId: event.id,
          code: seed.coupon.code,
          discountType: seed.coupon.discountType,
          discountValue: seed.coupon.discountValue,
          maxDiscount: seed.coupon.maxDiscount,
          minimumPurchase: 0,
          maxPerUser: 2,
          isActive: true,
        },
      });
    }
  }

  const firstEvent = await prisma.event.findUniqueOrThrow({
    where: { slug: eventSeeds[0]!.slug },
  });
  await prisma.eventStaff.upsert({
    where: { eventId_userId: { eventId: firstEvent.id, userId: staff.id } },
    update: { role: 'CHECK_IN' },
    create: { eventId: firstEvent.id, userId: staff.id, role: 'CHECK_IN' },
  });

  await seedDashboard();
  console.log('Seed selesai.');
  console.log(`Admin demo: ${adminEmail}`);
  console.log(`Organizer demo: ${organizerEmail}`);
  console.log(`Staff demo: ${staffEmail}`);
  console.log('Kata sandi demo dibaca dari SEED_*_PASSWORD atau nilai default development.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
