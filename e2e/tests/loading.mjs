import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const response = await fetch(`${base}/api/v1/events?limit=1`);
assert.equal(response.ok, true, 'Start the web and API before checking loading states');
const { data: events } = await response.json();
assert.ok(events?.length, 'A published event is required');
const event = events[0];
const session = `gofest-loading-${process.pid}`;
const temporary = mkdtempSync(join(tmpdir(), 'gofest-loading-'));
const init = join(temporary, 'observe.js');
writeFileSync(
  init,
  `
  window.__loadingAudit = { boot: false, pages: [], routes: [], interactive: false, moving: false, overflow: false };
  const seen = new WeakSet();
  new MutationObserver(() => {
    const audit = window.__loadingAudit;
    if (document.querySelector('.boot-loading')) audit.boot = true;
    for (const node of document.querySelectorAll('[data-page-loading], [data-route-loading]')) {
      if (seen.has(node)) continue;
      seen.add(node);
      if (node.hasAttribute('data-page-loading')) {
        audit.pages.push(location.pathname);
        audit.moving ||= [...node.querySelectorAll('div')].some(element => getComputedStyle(element).animationName !== 'none');
        audit.interactive ||= [...node.querySelectorAll('a,button,input,select')].some(element => !element.closest('[inert]'));
        audit.overflow ||= document.documentElement.scrollWidth > innerWidth + 1;
      } else {
        audit.routes.push(location.pathname);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    if (String(args[0]).includes('/api/v1/events')) await new Promise(resolve => setTimeout(resolve, 1200));
    return originalFetch(...args);
  };
`,
);

function browser(...args) {
  const output = execFileSync('agent-browser', ['--session', session, '--json', ...args], {
    encoding: 'utf8',
    timeout: 35_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.success, true, result.error?.message ?? `Failed: ${args[0]}`);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const ready = () =>
  wait(
    '!document.querySelector("[data-page-loading], [data-route-loading], .boot-loading") && !!document.querySelector("main h1")',
  );
const open = (path) => {
  browser('open', new URL(path, base).href);
  ready();
};
const audit = () => evaluate('window.__loadingAudit');
const link = (name) => {
  const previous = evaluate('location.pathname');
  browser('find', 'role', 'link', 'click', '--name', name, '--exact');
  wait(`location.pathname !== ${JSON.stringify(previous)}`);
  ready();
};

try {
  browser('--init-script', init, 'open');
  browser('set', 'viewport', '1440', '800');
  browser('set', 'media', 'light', 'reduced-motion');
  open('/');
  assert.ok(audit().boot, 'HTML skeleton appears before the app starts');
  assert.ok(
    audit().pages.includes('/'),
    'Home has a loading skeleton during a real delayed request',
  );
  assert.equal(
    evaluate('document.querySelectorAll(".city-destination").length'),
    0,
    'Below-fold cities are deferred',
  );
  assert.equal(
    evaluate(
      'performance.getEntriesByType("resource").some(entry => entry.name.includes("city-landmarks"))',
    ),
    false,
    'City art is not requested before its section approaches the viewport',
  );
  evaluate('document.getElementById("cities-heading").scrollIntoView()');
  browser('wait', '.city-destination');
  assert.equal(evaluate('document.querySelectorAll(".city-destination").length'), 5);
  assert.ok(
    evaluate(
      '[...document.querySelectorAll(".event-poster img")].every(image => image.loading === "lazy" && image.decoding === "async")',
    ),
    'Posters load lazily and decode asynchronously',
  );

  link('Kota Jakarta');
  ready();
  assert.ok(
    audit().routes.includes('/events/city/jakarta'),
    'Link navigation shows the site skeleton',
  );
  wait('document.querySelector("#city-event-results")?.getAttribute("aria-busy") === "false"');
  browser('back');
  ready();
  assert.equal(evaluate('location.pathname'), '/');
  browser('forward');
  ready();
  assert.equal(evaluate('location.pathname'), '/events/city/jakarta');
  browser('reload');
  ready();
  assert.ok(
    audit().boot && audit().pages.includes('/events/city/jakarta'),
    'Reload shows boot and page skeletons',
  );

  for (const path of [
    '/events',
    `/events/${event.slug}`,
    `/checkout/${event.slug}`,
    `/organizers/${event.organizer.slug}`,
    '/login',
    '/register',
    '/forgot-password',
    '/terms',
  ]) {
    for (const width of [320, 1440]) {
      browser('set', 'viewport', String(width), '900');
      open(path);
      assert.ok(audit().pages.includes(path), `${path}: page skeleton appears at ${width}px`);
      assert.equal(audit().moving, false, 'Reduced motion disables every skeleton animation');
      assert.equal(audit().interactive, false, 'Skeletons expose no fake interactive controls');
      assert.equal(audit().overflow, false, `${path}: skeleton fits ${width}px`);
      assert.equal(
        evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
        false,
        `${path}: loaded content fits ${width}px`,
      );
    }
  }

  open('/login');
  link('Daftar sekarang');
  ready();
  link('Masuk');
  ready();
  assert.ok(
    audit().routes.includes('/login'),
    'Returning to a cached page still shows the transition',
  );
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');

  browser('network', 'route', '**/api/v1/events*', '--abort');
  browser('open', new URL('/events', base).href);
  browser('wait', '[role="alert"]');
  assert.equal(
    evaluate(
      'document.querySelectorAll("#event-results [aria-busy=true], [data-route-loading]").length',
    ),
    0,
    'Failed requests leave the skeleton and show an error',
  );
  browser('network', 'unroute');
  browser('find', 'role', 'button', 'click', '--name', 'Coba Lagi', '--exact');
  wait('document.querySelectorAll(".event-card").length > 0');
  ready();
  assert.equal(
    evaluate('document.querySelectorAll("main [role=alert]").length'),
    0,
    'Retry restores real event content',
  );
  assert.equal(browser('a11y').counts.violations, 0, 'Loaded catalog accessibility');
  process.stdout.write(
    'PASS boot/reload/link/back/forward/cached skeletons, real slow requests, reduced motion, mobile layout, deferred city code/art, lazy images, request failure and retry.\n',
  );
} finally {
  browser('close');
  rmSync(temporary, { recursive: true, force: true });
}
