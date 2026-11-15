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
  wait('!document.querySelector("[data-route-loading], [data-page-loading]")');
};
const ready = () =>
  wait('document.querySelector("#event-results")?.getAttribute("aria-busy") === "false"');
try {
  browser('set', 'viewport', '1440', '1000');
  open('/events');
  ready();
  const initialCards = evaluate('document.querySelectorAll(".event-card").length');
  assert.ok(initialCards > 0, 'Published seed events are required');
  open('/');
  browser('wait', 'nav[aria-label="Pilih kategori"]');
  assert.equal(evaluate('document.querySelectorAll("header .category-menu-trigger").length'), 0);
  browser('click', 'nav[aria-label="Pilih kategori"] a[href="/events?category=film"]');
  wait('new URLSearchParams(location.search).get("category") === "film"');
  ready();
  assert.equal(evaluate('new URLSearchParams(location.search).get("category")'), 'film');
  assert.equal(evaluate('document.querySelectorAll("main select").length'), 0);
  click('Semua acara');
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
  browser('find', 'role', 'link', 'click', '--name', 'Music', '--exact');
  wait('new URLSearchParams(location.search).get("category") === "musik"');
  ready();
  wait(`document.querySelector('.catalog-category-active')?.textContent.includes('Music')`);
  assert.equal(evaluate('new URLSearchParams(location.search).get("category")'), 'musik');
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
  click('Continue');
  browser('wait', '--text', 'Enter a valid email');
  assert.ok(evaluate('document.querySelector("main").textContent.includes("Enter a valid email")'));
  browser('set', 'viewport', '390', '1000');
  open('/events');
  click('Open menu');
  browser('wait', '#mobile-navigation');
  assert.equal(evaluate('document.querySelectorAll("header .category-menu-trigger").length'), 0);
  assert.equal(browser('a11y').counts.violations, 0, 'Mobile navigation accessibility');
  assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
  click('Choose language');
  browser('find', 'role', 'menuitem', 'click', '--name', 'Bahasa Indonesia', '--exact');
  wait('document.documentElement.lang === "id"');
  assert.equal(evaluate('document.documentElement.lang'), 'id');
  open('/');
  evaluate('document.getElementById("cities-heading").scrollIntoView()');
  browser('wait', '.city-destination');
  assert.equal(evaluate('document.querySelectorAll(".city-destination").length'), 5);
  browser('wait', '.hero-slide-current .hero-banner-link[href^="/events/"]');
  assert.equal(
    evaluate('document.querySelectorAll(".event-carousel button[aria-label*=otomatis]").length'),
    0,
    'No stop button',
  );
  const initialSlide = evaluate(
    'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
  );
  click('Sorotan berikutnya');
  assert.notEqual(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    initialSlide,
  );
  click('Sorotan sebelumnya');
  assert.equal(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    initialSlide,
  );
  click('Lihat sorotan 2');
  wait(
    `document.querySelector('button[aria-label="Lihat sorotan 2"]').getAttribute('aria-pressed') === 'true'`,
  );
  assert.equal(
    evaluate(
      `document.querySelector('button[aria-label="Lihat sorotan 2"]').getAttribute('aria-pressed')`,
    ),
    'true',
  );
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    const layout = evaluate(`(() => {
      const hero = document.querySelector('.hero-frame').getBoundingClientRect();
      const cities = [...document.querySelectorAll('.city-destination')].map(e => e.getBoundingClientRect());
      const landmark = document.querySelector('.city-landmark').getBoundingClientRect();
      const left = document.querySelector('.carousel-arrow-left').getBoundingClientRect();
      const right = document.querySelector('.carousel-arrow-right').getBoundingClientRect();
      return { heroLeft: hero.left, heroRight: hero.right, viewport: innerWidth,
        height: hero.height, arrowsCentered: Math.abs(left.top + left.height / 2 - (hero.top + hero.height / 2)) < 1 && Math.abs(left.top - right.top) < 1,
        arrowsAtEdges: left.left < 50 && right.right > innerWidth - 50,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        cityRows: new Set(cities.map(e => Math.round(e.top))).size,
        landmarkRatio: landmark.width / landmark.height };
    })()`);
    assert.ok(Math.abs(layout.heroLeft) < 1, `Banner reaches left edge at ${width}px`);
    assert.ok(Math.abs(layout.heroRight - width) < 1, `Banner reaches right edge at ${width}px`);
    assert.equal(layout.overflow, false, `No overflow at ${width}px`);
    assert.ok(layout.height >= 380, 'Banner has a taller composition');
    assert.ok(
      layout.arrowsCentered && layout.arrowsAtEdges,
      'Arrows sit at the left and right sides',
    );
    assert.ok(Math.abs(layout.landmarkRatio - 0.6) < 0.01, 'Landmarks retain their native ratio');
    if (width === 1440) assert.equal(layout.cityRows, 1, 'Five cities fit one desktop row');
  }
  browser('set', 'viewport', '390', '1000');
  browser('find', 'role', 'link', 'click', '--name', 'Kota Denpasar', '--exact');
  wait('location.pathname === "/events/city/denpasar"');
  wait('document.querySelector("#city-event-results")?.getAttribute("aria-busy") === "false"');
  assert.equal(
    evaluate('document.querySelector("h1").textContent'),
    'Event Menarik di Kota Denpasar',
  );
  assert.equal(evaluate('document.querySelectorAll("main [role=alert]").length'), 0);
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write(
    'PASS homepage categories, mobile navigation, full-width banners and city proportions at five widths, carousel controls, category-only catalog, music navigation, ID/English persistence, auth validation, password visibility, city links, zero browser errors.\n',
  );
} finally {
  browser('close');
}
