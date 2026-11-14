import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Gofest API berjalan');
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Menutup API');

  const forceTimer = setTimeout(() => {
    logger.error('Penutupan API melewati batas waktu');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close(async (error) => {
    if (error) {
      logger.error({ error }, 'Gagal menutup HTTP server');
    }
    await prisma.$disconnect();
    clearTimeout(forceTimer);
    process.exit(error ? 1 : 0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  void shutdown('uncaughtException');
});
