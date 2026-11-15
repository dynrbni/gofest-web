import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = process.env.QA_SESSION ?? `gofest-smoke-${process.pid}`;
const apiBase = process.env.QA_API_URL ?? `${base}/api/v1`;
const role = process.env.QA_ROLE;
const response = await fetch(`${apiBase}/events?limit=1`);
assert.equal(response.ok, true, 'The API must be running before browser checks');
const { data: events } = await response.json();
assert.ok(events?.length, 'Seed at least one published event before browser checks');
const event = events[0];

function browser(...args) {
  const output = execFileSync('agent-browser', ['--session', session, '--json', ...args], {
    encoding: 'utf8',
    timeout: 35_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.success, true, result.error?.message ?? `Browser command failed: ${args[0]}`);
  return result.data;
}

const publicRoutes = [
  '/',
  '/events',
  '/events?q=zzzgofest-no-matching-event',
  `/events/${event.slug}`,
  `/checkout/${event.slug}`,
  `/organizers/${event.organizer.slug}`,
  '/login',
  '/register',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/page-that-does-not-exist',
];
const protectedRoutes = {
  admin: [
    '/admin',
    '/admin/users',
    '/admin/organizers',
    '/admin/events',
    '/admin/orders',
    '/admin/categories',
    '/admin/settings',
    '/admin/audit-logs',
  ],
  organizer: [
    '/organizer',
    '/organizer/events',
    '/organizer/events/new',
    '/organizer/settings',
    '/account',
    '/account/orders',
    '/account/profile',
    ...['edit', 'tickets', 'coupons', 'orders', 'staff', 'check-in'].map(
      (tab) => `/organizer/events/${event.id}/${tab}`,
    ),
  ],
  buyer: ['/account', '/account/orders', '/account/profile'],
  staff: ['/staff/events'],
};
if (role) {
  assert.ok(protectedRoutes[role], 'QA_ROLE must be admin, organizer, buyer, or staff');
}
const routes = role ? protectedRoutes[role] : publicRoutes;

let checked = 0;
const failures = [];
for (const width of [390, 1440]) {
  browser('set', 'viewport', String(width), '1000');
  for (const path of routes) {
    try {
      browser('open', new URL(path, base).href);
      browser('wait', 'main h1');
      browser(
        'eval',
        'document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).forEach(a=>a.finish())',
      );
      const { result } = browser(
        'eval',
        `({
      path: location.pathname,
      headings: document.querySelectorAll('main h1').length,
      heading: document.querySelector('main h1')?.textContent,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      alerts: [...document.querySelectorAll('main [role="alert"]')].map(e=>e.textContent),
      crash: document.body.innerText.includes('Halaman belum bisa ditampilkan.')
    })`,
      );
      assert.equal(result.crash, false, `${path}: route crashed`);
      assert.equal(result.headings, 1, `${path}: expected exactly one page heading`);
      assert.equal(result.overflow, false, `${path}: horizontal overflow at ${width}px`);
      assert.equal(result.alerts.length, 0, `${path}: unexpected error state`);
      if (role && protectedRoutes[role].includes(path))
        assert.equal(result.path, path, 'Protected route redirected unexpectedly');
      const audit = browser('a11y');
      assert.equal(
        audit.counts.violations,
        0,
        `${path} at ${width}px: ${audit.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`).join(', ')}`,
      );
      checked += 1;
      process.stdout.write(`PASS ${width}px ${path}\n`);
    } catch (error) {
      failures.push({ path, width, message: error.message });
      process.stderr.write(`FAIL ${width}px ${path}: ${error.message}\n`);
    }
  }
}
if (!process.env.QA_SESSION) browser('close');
assert.deepEqual(failures, [], 'Browser checks failed; see FAIL lines above');
process.stdout.write(`${checked} browser route checks passed.\n`);
