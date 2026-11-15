import { prisma } from '../lib/prisma';

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.info('Database siap.');
  } catch {
    console.error(
      'Database belum dapat dijangkau. Jalankan PostgreSQL dan periksa DATABASE_URL di apps/api/.env. Lihat bagian troubleshooting database di README.md.',
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
