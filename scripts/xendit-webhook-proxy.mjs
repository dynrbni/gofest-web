import process from 'node:process';
import { log } from 'node:console';
import { createServer, request } from 'node:http';

const routes = new Set(['/api/v1/webhooks/payments/xendit', '/api/v1/webhooks/payouts/xendit']);
const port = Number(process.env.XENDIT_WEBHOOK_PROXY_PORT ?? 4010);
const apiPort = Number(process.env.PORT ?? 4000);

createServer((incoming, response) => {
  if (incoming.method !== 'POST' || !routes.has(incoming.url)) {
    response.writeHead(404).end();
    return;
  }

  const upstream = request(
    {
      hostname: '127.0.0.1',
      port: apiPort,
      method: 'POST',
      path: incoming.url,
      headers: {
        'content-type': incoming.headers['content-type'] ?? 'application/json',
        'x-callback-token': incoming.headers['x-callback-token'] ?? '',
      },
      timeout: 15_000,
    },
    (result) => {
      response.writeHead(result.statusCode ?? 502, {
        'content-type': result.headers['content-type'] ?? 'application/json',
      });
      result.pipe(response);
    },
  );

  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  incoming.on('aborted', () => upstream.destroy());
  incoming.pipe(upstream);
}).listen(port, '127.0.0.1', () => {
  log(`Xendit webhook proxy listening on 127.0.0.1:${port}`);
});
