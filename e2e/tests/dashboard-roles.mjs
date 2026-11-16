import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = process.env.QA_SESSION ?? `gofest-dashboard-${process.pid}`;
const screenshots = '/tmp/gofest-dashboard-qa';
mkdirSync(screenshots, { recursive: true });
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message ?? args.join(' '));
  return result.data;
}
function evaluate(source) {
  return browser('eval', source).result;
}
function open(path) {
  browser('open', new URL(path, base).href);
  browser('wait', '--fn', 'Boolean(document.querySelector("main h1, main [role=alert]"))');
  browser('wait', '--fn', '!document.querySelector("main [aria-busy=true]")');
}
function login(email, destination) {
  browser('open', `${base}/login`);
  browser(
    'wait',
    '--fn',
    'document.querySelector("#login-email") && !document.querySelector("[inert] #login-email")',
  );
  browser('find', 'label', 'Email', 'fill', email);
  browser('find', 'label', 'Password', 'fill', process.env.QA_PASSWORD ?? 'admin123');
  evaluate('document.querySelector("form").requestSubmit()');
  browser('wait', '--url', `**${destination}`);
  browser('wait', '--fn', 'Boolean(document.querySelector("main h1, main [role=alert]"))');
  browser('wait', '--fn', '!document.querySelector("main [aria-busy=true]")');
}
function logout() {
  browser(
    'eval',
    '[...document.querySelectorAll("button")].find(button => button.textContent.includes("Keluar")).click()',
  );
  browser('wait', '--url', '**/login');
}
function verify(path, width) {
  open(path);
  const result = evaluate(
    '({ path: location.pathname, headings: document.querySelectorAll("main h1").length, heading: document.querySelector("main h1")?.textContent, overflow: document.documentElement.scrollWidth > innerWidth + 1, alerts: [...document.querySelectorAll("main [role=alert]")].map(e => e.textContent), crash: document.body.innerText.includes("Halaman belum bisa ditampilkan.") })',
  );
  assert.equal(result.crash, false, `${path}: route crash`);
  assert.equal(result.headings, 1, `${path}: exactly one page heading`);
  assert.equal(result.overflow, false, `${path}: horizontal overflow at ${width}px`);
  assert.deepEqual(result.alerts, [], `${path}: API error state`);
  assert.equal(result.path, path.split('?')[0], `${path}: unexpected redirect`);
  assert.ok(!result.heading.includes('bukan untuk'), `${path}: unexpected access denial`);
  process.stdout.write(`PASS ${width}px ${path}\n`);
}
const operational = [
  '/admin/dashboard',
  '/admin/events',
  '/admin/events?status=PENDING_REVIEW',
  '/admin/categories',
  '/admin/users',
  '/admin/organizers',
  '/admin/orders',
  '/admin/payments',
  '/admin/refunds',
  '/admin/finance',
  '/admin/event-reports',
  '/admin/payouts',
  '/admin/payouts/history',
  '/admin/check-in',
  '/admin/check-in/history',
  '/admin/staff',
  '/admin/content?kind=HOMEPAGE',
  '/admin/content?kind=BANNER',
  '/admin/promotions',
  '/admin/support',
  '/admin/notifications',
];
const system = ['/admin/admins', '/admin/permissions', '/admin/settings', '/admin/audit-logs'];
const creator = [
  '/creator/dashboard',
  '/creator/events',
  '/creator/events?status=DRAFT',
  '/creator/events?status=PENDING_REVIEW',
  '/creator/events/new',
  '/creator/tickets',
  '/creator/promotions',
  '/creator/orders',
  '/creator/attendees',
  '/creator/check-in',
  '/creator/check-in/history',
  '/creator/staff',
  '/creator/finance',
  '/creator/payouts',
  '/creator/bank-accounts',
  '/creator/event-reports',
  '/creator/payouts/history',
  '/creator/marketing',
  '/creator/links',
  '/creator/settings',
  '/creator/support',
  '/creator/notifications',
];
try {
  for (const [email, destination, paths] of [
    ['superadmin@gofest.com', '/admin/dashboard', [...operational, ...system]],
    ['admin@gofest.com', '/admin/dashboard', operational],
    ['organizer@gofest.com', '/creator/dashboard', creator],
  ]) {
    login(email, destination);
    const profile = email.split('@')[0];
    const apiBase = profile === 'organizer' ? '/creator' : '/admin';
    const sample = evaluate(
      `fetch('/api/v1${apiBase}/events?limit=1', {credentials:'include'}).then(response=>response.json()).then(body=>body.data[0])`,
    );
    const details = sample
      ? ['edit', 'tickets', 'coupons', 'staff', 'orders', 'check-in']
          .map((tab) => `${apiBase}/events/${sample.id}/${tab}`)
          .concat(`${apiBase}/event-reports/${sample.id}`)
      : [];
    for (const width of [1440, 390]) {
      browser('set', 'viewport', String(width), '1000');
      for (const path of [...paths, ...details]) verify(path, width);
      open(destination);
      browser('screenshot', `${screenshots}/${profile}-${width}.png`);
      const audit = browser('a11y', '--tags', 'wcag2a,wcag2aa');
      assert.equal(audit.counts.violations, 0, `${email}: accessibility violations at ${width}px`);
      if (width === 390) {
        browser('eval', 'document.querySelector("header button[aria-haspopup=dialog]").click()');
        browser('wait', '[role=dialog]');
        assert.equal(
          evaluate('Boolean(document.querySelector("[role=dialog]"))'),
          true,
          'mobile drawer opens',
        );
        browser('eval', 'document.querySelector("[role=dialog] button").click()');
      }
    }
    if (profile === 'admin') {
      open('/admin/admins');
      assert.match(evaluate('document.querySelector("main h1").textContent'), /bukan untuk/);
      assert.equal(
        evaluate(
          '[...document.querySelectorAll("nav a")].some(a=>a.textContent==="Admin Management")',
        ),
        false,
      );
    }
    if (profile === 'organizer') {
      open('/admin/dashboard');
      assert.match(evaluate('document.querySelector("main h1").textContent'), /bukan untuk/);
    }
    open(destination);
    logout();
    browser('close');
  }
  process.stdout.write(
    'Dashboard roles, routes, desktop/mobile overflow, drawer, and overview accessibility passed.\n',
  );
} finally {
  if (!process.env.QA_SESSION) browser('close');
}
