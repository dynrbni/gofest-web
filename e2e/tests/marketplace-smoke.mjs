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
      browser('eval', 'document.fonts.ready');
      const typography = browser(
        'eval',
        `({
        family: getComputedStyle(document.body).fontFamily,
        bodyWeight: getComputedStyle(document.body).fontWeight,
        fontLoaded: document.fonts.check('400 16px "DM Sans Variable"'),
        heavyText: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,button,label,th,td,input,select,textarea')]
          .filter(element => element.getBoundingClientRect().width > 0 && Number(getComputedStyle(element).fontWeight) > 600)
          .map(element => element.textContent.slice(0, 60))
      })`,
      ).result;
      assert.ok(typography.family.startsWith('"DM Sans Variable"'), `${path}: new DM Sans family`);
      assert.equal(typography.fontLoaded, true, `${path}: local variable font loads`);
      assert.equal(typography.bodyWeight, '400', `${path}: body uses regular weight`);
      assert.deepEqual(typography.heavyText, [], `${path}: no excessive bold text`);
      browser(
        'wait',
        '--fn',
        `[...document.querySelectorAll('img[src="/assets/gofest-logo.png"]')].every(img => img.complete && img.naturalWidth > 0)`,
      );
      const logos = browser(
        'eval',
        `[...document.querySelectorAll('img[src="/assets/gofest-logo.png"]')].filter(img => img.getBoundingClientRect().width > 0).map(img => {
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        return { height: rect.height, ratio: rect.width / rect.height, fit: style.objectFit, shadow: style.boxShadow, filter: style.filter, border: style.borderWidth, background: style.backgroundColor };
      })`,
      ).result;
      assert.ok(logos.length > 0, `${path}: supplied logo is visible`);
      for (const logo of logos) {
        assert.ok(
          Math.abs(logo.height - (width < 640 ? 36 : 44)) < 1,
          `${path}: responsive logo height`,
        );
        assert.ok(Math.abs(logo.ratio - 2192 / 690) < 0.01, `${path}: original logo aspect ratio`);
        assert.equal(logo.fit, 'contain');
        assert.equal(logo.shadow, 'none');
        assert.equal(logo.filter, 'none');
        assert.equal(logo.border, '0px');
        assert.equal(logo.background, 'rgba(0, 0, 0, 0)');
      }
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
