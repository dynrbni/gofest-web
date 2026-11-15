import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-discovery-${process.pid}`;
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
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const open = (path) => {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
};
const ready = () =>
  wait('document.querySelector("#event-results")?.getAttribute("aria-busy") === "false"');

try {
  browser('set', 'viewport', '1440', '1000');
  open('/events');
  ready();
  const initialCards = evaluate('document.querySelectorAll(".event-card").length');
  assert.ok(initialCards > 0, 'Published seed events are required');
  click('Kategori');
  browser('wait', '.category-mega-menu');
  assert.equal(browser('a11y').counts.violations, 0, 'Category menu accessibility');
  browser('press', 'Escape');
  wait('!document.querySelector(".category-menu-trigger[data-state=open]")');
  click('Film');
  wait('new URLSearchParams(location.search).get("category") === "film"');
  ready();
  assert.equal(evaluate('new URLSearchParams(location.search).get("category")'), 'film');
  browser('select', 'select[aria-label="Lokasi acara"]', 'Bandung');
  wait('new URLSearchParams(location.search).get("city") === "Bandung"');
  ready();
  assert.equal(evaluate('new URLSearchParams(location.search).get("city")'), 'Bandung');
  assert.ok(
    evaluate(
      '[...document.querySelectorAll(".event-card")].every(card => card.textContent.includes("Bandung"))',
    ),
  );
  browser('select', 'select[aria-label="Harga tiket"]', 'free');
  wait('new URLSearchParams(location.search).get("price") === "free"');
  ready();
  assert.equal(
    evaluate('new URLSearchParams(location.search).get("category")'),
    'film',
    'Price change preserves category',
  );
  assert.equal(
    evaluate('new URLSearchParams(location.search).get("city")'),
    'Bandung',
    'Price change preserves city',
  );
  click('Reset');
  wait('location.search === ""');
  ready();
  assert.equal(evaluate('location.search'), '');
  assert.equal(evaluate('document.querySelectorAll(".event-card").length'), initialCards);
  click('Semua tanggal');
  // The CLI's native date fill leaves date inputs empty on this browser engine.
  evaluate(`for (const [id, value] of [['events-date-from', '2026-12-01'], ['events-date-to', '2026-12-31']]) {
    const input = document.getElementById(id);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }`);
  wait('document.getElementById("events-date-to").getAttribute("value") === "2026-12-31"');
  click('Terapkan');
  wait('new URLSearchParams(location.search).has("dateFrom")');
  ready();
  assert.equal(
    evaluate('new URLSearchParams(location.search).get("dateFrom")'),
    '2026-11-30T17:00:00.000Z',
  );
  assert.equal(
    evaluate('new URLSearchParams(location.search).get("dateTo")'),
    '2026-12-31T16:59:59.000Z',
  );
  click('Reset');
  wait('location.search === ""');
  ready();
  click('Pilih bahasa');
  browser('find', 'role', 'menuitem', 'click', '--name', 'English', '--exact');
  wait('document.documentElement.lang === "en"');
  assert.equal(evaluate('document.documentElement.lang'), 'en');
  assert.equal(
    evaluate('document.querySelector("h1").textContent'),
    'Find your next favourite event',
  );
  browser('reload');
  browser('wait', 'main h1');
  assert.equal(evaluate('document.documentElement.lang'), 'en', 'Language persists after reload');
  browser('click', 'nav[aria-label="Event navigation"] a[href="/events?price=free"]');
  wait('new URLSearchParams(location.search).get("price") === "free"');
  ready();
  assert.equal(
    evaluate(
      `document.querySelector('nav[aria-label="Event navigation"] a[aria-current=page]').textContent`,
    ),
    'Free events',
  );
  open('/login');
  click('Log in');
  browser('wait', '--text', 'Enter your email');
  assert.ok(evaluate('document.querySelector("main").textContent.includes("Enter your email")'));
  browser('fill', '#login-password', 'Example123');
  click('Show password');
  wait('document.querySelector("#login-password").type === "text"');
  assert.equal(evaluate('document.querySelector("#login-password").type'), 'text');
  click('Hide password');
  wait('document.querySelector("#login-password").type === "password"');
  assert.equal(evaluate('document.querySelector("#login-password").type'), 'password');
  open('/register');
  click('Create account');
  browser('wait', '--text', 'Please accept the terms');
  assert.ok(
    evaluate('document.querySelector("main").textContent.includes("Please accept the terms")'),
  );
  browser('set', 'viewport', '390', '1000');
  open('/events');
  click('Open menu');
  browser('wait', '#mobile-navigation');
  click('Categories');
  browser('wait', '.category-mega-menu');
  assert.equal(browser('a11y').counts.violations, 0, 'Mobile category menu accessibility');
  assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
  browser('press', 'Escape');
  click('Choose language');
  browser('find', 'role', 'menuitem', 'click', '--name', 'Bahasa Indonesia', '--exact');
  wait('document.documentElement.lang === "id"');
  assert.equal(evaluate('document.documentElement.lang'), 'id');
  open('/');
  browser('wait', '.city-destination');
  assert.equal(evaluate('document.querySelectorAll(".city-destination").length'), 5);
  browser('find', 'role', 'link', 'click', '--name', 'Kota Denpasar', '--exact');
  wait('new URLSearchParams(location.search).get("city") === "Denpasar"');
  ready();
  assert.equal(evaluate('new URLSearchParams(location.search).get("city")'), 'Denpasar');
  assert.equal(evaluate('document.querySelectorAll("main [role=alert]").length'), 0);
  process.stdout.write(
    'PASS category menu, city/price/date filters, reset, free navigation, ID/English persistence, auth validation, password visibility, mobile category menu, city links.\n',
  );
} finally {
  browser('close');
}
