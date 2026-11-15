import http from 'node:http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { releaseExpiredOrders } from './modules/orders/order.service';
import { processEmailQueue } from './modules/notifications/email.service';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    void prisma.$queryRaw`SELECT 1`.then(
      () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            service: 'gofest-worker',
            time: new Date().toISOString(),
          }),
        );
      },
      () => {
        res.writeHead(503, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'unavailable', service: 'gofest-worker' }));
      },
    );
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'NOT_FOUND' }));
});

server.listen(env.WORKER_PORT, () => {
  logger.info({ port: env.WORKER_PORT }, 'Gofest worker berjalan');
});

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const [emails, expired] = await Promise.all([processEmailQueue(20), releaseExpiredOrders(50)]);
    if (emails > 0 || expired > 0) {
      logger.info({ emails, expiredOrders: expired }, 'Worker menyelesaikan antrean');
    }
  } catch (error) {
    logger.error(
      { err: error },
      'Worker gagal memproses antrean; periksa koneksi database. Akan dicoba lagi dalam 30 detik.',
    );
  } finally {
    running = false;
  }
}

const timer = setInterval(() => void tick(), 30_000);
timer.unref();
void tick();

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Menutup worker');
  clearInterval(timer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
