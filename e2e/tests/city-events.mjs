import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-cities-${process.pid}`;
const cities = [
  ['jakarta', 'Jakarta', 'Monas'],
  ['bandung', 'Bandung', 'Gedung Sate'],
  ['yogyakarta', 'Yogyakarta', 'Tugu Yogyakarta'],
  ['surabaya', 'Surabaya', 'Patung Sura dan Baya'],
  ['denpasar', 'Denpasar', 'Pura di Denpasar'],
];

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
const link = (name) => browser('find', 'role', 'link', 'click', '--name', name, '--exact');
const open = (path) => {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
};
const ready = () =>
  wait(
    '!document.querySelector("[data-route-loading]") && document.querySelector("#city-event-results")?.getAttribute("aria-busy") === "false"',
  );
const heading = () =>
  evaluate('document.querySelector("main h1").textContent.replace(/\\s+/g, " ").trim()');

try {
  browser('set', 'viewport', '1440', '1000');
  open('/');
  evaluate('document.getElementById("cities-heading").scrollIntoView()');
  browser('wait', '.city-destination');
  assert.deepEqual(
    evaluate(
      '[...document.querySelectorAll(".city-destination")].map(link => link.getAttribute("href"))',
    ),
    cities.map(([slug]) => `/events/city/${slug}`),
  );
  link('Kota Jakarta');
  ready();
  assert.equal(new URL(browser('get', 'url').url).pathname, '/events/city/jakarta');

  for (const [slug, name, landmark] of cities) {
    open(`/events/city/${slug}?city=Bogor&category=film`);
    ready();
    assert.equal(heading(), `Event Menarik di Kota ${name}`);
    assert.ok(evaluate('document.title').includes(name), 'Page title names its city');
    assert.equal(
      evaluate('document.querySelector("main [role=img]").getAttribute("aria-label")'),
      landmark,
    );
    assert.equal(
      evaluate(
        'document.querySelectorAll("main select, .catalog-categories, .catalog-filters").length',
      ),
      0,
      'Dedicated page has no catalog filters',
    );
    const response = await fetch(
      new URL(`/api/v1/events?citySlug=${slug}&limit=12&sort=starts_soon`, base),
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(evaluate('document.querySelectorAll(".event-card").length'), result.data.length);
    for (const event of result.data) {
      assert.equal(event.type, 'OFFLINE');
      assert.ok(
        evaluate(
          `document.getElementById('city-event-results').textContent.includes(${JSON.stringify(event.title)})`,
        ),
      );
    }
    if (!result.data.length) {
      assert.ok(
        evaluate(
          `document.querySelector('main').textContent.includes(${JSON.stringify(`Belum ada acara di ${name}`)})`,
        ),
      );
    }
    assert.equal(browser('a11y').counts.violations, 0, `Accessibility in ${name}`);
    for (const width of [1440, 1024, 768, 390, 320]) {
      browser('set', 'viewport', String(width), '1000');
      assert.equal(
        evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
        false,
        `${name} fits ${width}px`,
      );
    }
    browser('reload');
    ready();
    assert.equal(heading(), `Event Menarik di Kota ${name}`, 'City persists after refresh');
  }

  open('/events/city/jakarta?page=999999');
  ready();
  assert.equal(evaluate('document.querySelectorAll(".event-card").length'), 0);
  browser('find', 'role', 'button', 'click', '--name', 'Kembali ke halaman pertama', '--exact');
  wait('location.search === ""');
  ready();
  assert.equal(heading(), 'Event Menarik di Kota Jakarta');
  open('/events/city/jakarta?page=invalid');
  ready();
  assert.equal(evaluate('document.querySelectorAll("main [role=alert]").length'), 0);
  open('/events/city/unknown');
  assert.equal(heading(), 'Kota tidak ditemukan');
  assert.equal(
    evaluate('document.querySelectorAll(".event-card").length'),
    0,
    'Invalid city never falls back to all events',
  );
  link('Kota Bandung');
  ready();
  assert.equal(heading(), 'Event Menarik di Kota Bandung');
  link('Jelajahi kota lain');
  browser('wait', '.city-destination');
  assert.equal(new URL(browser('get', 'url').url).pathname, '/cities');
  assert.equal(evaluate('document.querySelectorAll(".city-destination").length'), 5);
  assert.equal(browser('a11y').counts.violations, 0, 'City directory accessibility');
  link('Kota Jakarta');
  ready();
  browser('set', 'viewport', '1440', '1000');
  browser('find', 'role', 'button', 'click', '--name', 'Pilih bahasa', '--exact');
  browser('find', 'role', 'menuitem', 'click', '--name', 'English', '--exact');
  wait('document.documentElement.lang === "en"');
  assert.equal(heading(), 'Events in Jakarta');
  browser('reload');
  ready();
  assert.equal(heading(), 'Events in Jakarta');
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  browser('network', 'route', '**/api/v1/events?citySlug=jakarta*', '--abort');
  browser('reload');
  wait('document.querySelector("#city-event-results")?.getAttribute("aria-busy") === "true"');
  browser('wait', 'main [role=alert]');
  assert.equal(
    evaluate('document.querySelectorAll(".event-card").length'),
    0,
    'Errors never display unscoped event cards',
  );
  browser('network', 'unroute');
  browser('find', 'role', 'button', 'click', '--name', 'Coba Lagi', '--exact');
  wait(
    'document.querySelector("#city-event-results")?.getAttribute("aria-busy") === "false" && !document.querySelector("main [role=alert]")',
  );
  assert.equal(
    evaluate('document.querySelectorAll("main [role=alert]").length'),
    0,
    'Retry recovers',
  );
  process.stdout.write(
    'PASS five city pages, exact API results, city links, isolated query params, refresh, invalid city/page recovery, loading/empty/error states and retry, ID/English, accessibility, and 25 responsive layouts; zero runtime errors.\n',
  );
} finally {
  browser('close');
}
