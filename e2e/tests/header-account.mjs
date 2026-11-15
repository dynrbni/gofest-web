import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-header-${process.pid}`;
const categoriesResponse = await fetch(`${base}/api/v1/categories`);
assert.equal(categoriesResponse.ok, true);
const {
  data: { categories },
} = await categoriesResponse.json();
assert.ok(categories.length > 0, 'Seed categories before this test');

function browser(...args) {
  const output = execFileSync('agent-browser', ['--session', session, '--json', ...args], {
    encoding: 'utf8',
    timeout: 35_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.success, true, result.error?.message ?? result.error ?? `Failed: ${args[0]}`);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const open = (path) => {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
};
const button = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const menuItem = (name) => browser('find', 'role', 'menuitem', 'click', '--name', name, '--exact');
const accountMenu = () => browser('click', 'header button[aria-label^="Menu akun"]');
const menuItems = () =>
  evaluate(
    '[...document.querySelectorAll("[role=menuitem]")].map(item => item.textContent.trim())',
  );

try {
  browser('set', 'viewport', '1440', '1000');
  open('/');
  browser('wait', 'nav[aria-label="Pilih kategori"]');
  wait(`!!document.querySelector('header a[href="/login"]')`);
  assert.equal(
    evaluate(
      'document.querySelectorAll("header .category-menu-trigger, header [role=dialog]").length',
    ),
    0,
  );
  assert.equal(
    evaluate(
      'document.querySelector("#featured-heading").closest("section").nextElementSibling.querySelector("h2").id',
    ),
    'categories-heading',
  );
  assert.deepEqual(
    evaluate(
      `[...document.querySelectorAll('nav[aria-label="Pilih kategori"] a')].map(link => link.getAttribute('href'))`,
    ),
    categories.map((category) => `/events?category=${encodeURIComponent(category.slug)}`),
  );
  assert.ok(evaluate('document.querySelector("header").textContent.includes("Jadi Partner Kami")'));
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Guest header/categories fit ${width}px`,
    );
  }
  browser('set', 'viewport', '1440', '1000');
  assert.equal(
    browser('a11y', '--selector', 'section[aria-labelledby="categories-heading"]').counts
      .violations,
    0,
  );
  browser('click', 'nav[aria-label="Pilih kategori"] a');
  wait('location.pathname === "/events" && new URLSearchParams(location.search).has("category")');
  assert.equal(
    evaluate('new URLSearchParams(location.search).get("category")'),
    categories[0].slug,
  );
  wait('document.querySelector("#event-results")?.getAttribute("aria-busy") === "false"');
  browser('fill', '#header-event-search', 'acara uji');
  browser('press', 'Enter');
  wait('new URLSearchParams(location.search).get("q") === "acara uji"');
  open('/login?next=/');
  browser('fill', '#login-email', process.env.QA_EMAIL ?? 'organizer@demo.gofest.local');
  browser('fill', '#login-password', process.env.QA_PASSWORD ?? 'OrganizerDemo123!');
  button('Masuk');
  browser('wait', 'header button[aria-label^="Menu akun"]');
  assert.equal(
    evaluate(
      `document.querySelectorAll('header a[href="/login"], header a[href="/register"]').length`,
    ),
    0,
  );
  assert.equal(
    evaluate('document.querySelector("header").textContent.includes("Jadi Partner Kami")'),
    false,
  );
  const avatar = evaluate(`(() => {
    const button = document.querySelector('header button[aria-label^="Menu akun"]');
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height, text: button.textContent.trim(), svg: button.querySelectorAll('svg').length };
  })()`);
  assert.equal(avatar.width, 44);
  assert.equal(avatar.height, 44);
  assert.ok(avatar.text.length <= 2, 'Only initials are visible in the avatar');
  assert.equal(avatar.svg, 0, 'Avatar has no dropdown arrow');
  accountMenu();
  assert.deepEqual(menuItems(), ['Profil Saya', 'Transaksi Saya', 'Tiket Saya', 'Keluar']);
  assert.equal(
    browser('a11y', '--selector', '[role=menu]').counts.violations,
    0,
    'Account dropdown accessibility',
  );
  browser('press', 'Escape');
  browser('focus', 'header button[aria-label^="Menu akun"]');
  browser('press', 'Enter');
  browser('wait', '[role=menu]');
  menuItem('Profil Saya');
  wait('location.pathname === "/account/profile"');
  browser('wait', '#name');
  accountMenu();
  menuItem('Transaksi Saya');
  wait('location.pathname === "/account/orders"');
  browser('wait', '--text', 'Riwayat Pesanan');
  accountMenu();
  menuItem('Tiket Saya');
  wait('location.pathname === "/account/tickets"');
  wait(
    'document.querySelector("#my-tickets-heading")?.closest("section").getAttribute("aria-busy") === "false"',
  );
  assert.equal(evaluate('document.querySelectorAll("main [role=alert]").length'), 0);
  browser('reload');
  browser('wait', '#my-tickets-heading');
  wait(
    'document.querySelector("#my-tickets-heading")?.closest("section").getAttribute("aria-busy") === "false"',
  );
  for (const width of [1440, 1024]) {
    browser('set', 'viewport', String(width), '1000');
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Account fits ${width}px`,
    );
    accountMenu();
    browser('wait', '[role=menu]');
    assert.deepEqual(menuItems(), ['Profil Saya', 'Transaksi Saya', 'Tiket Saya', 'Keluar']);
    browser('press', 'Escape');
    wait('!document.querySelector("[role=menu]")');
  }
  for (const width of [768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Mobile account fits ${width}px`,
    );
  }
  button('Buka menu');
  browser('wait', '#mobile-navigation');
  assert.equal(
    evaluate('document.getElementById("mobile-navigation").textContent.includes("Partner")'),
    false,
  );
  browser('set', 'viewport', '1440', '1000');
  button('Pilih bahasa');
  menuItem('English');
  wait('document.documentElement.lang === "en"');
  browser('press', 'Escape');
  wait('!document.querySelector("[role=menu]")');
  browser('click', 'header button[aria-label^="Account menu for"]');
  browser('wait', '[role=menu]');
  assert.deepEqual(menuItems(), ['My Profile', 'My Transactions', 'My Tickets', 'Log out']);
  menuItem('Log out');
  browser('wait', 'header a[href="/login"]');
  assert.ok(evaluate('document.querySelector("header").textContent.includes("Partner with us")'));
  open('/account/tickets');
  wait('location.pathname === "/login"');
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write(
    'PASS full homepage categories, category/search navigation, guest/authenticated headers, avatar-only menu, all account routes, keyboard, logout, ID/English, ticket route protection, accessibility and nine responsive layouts.\n',
  );
} finally {
  browser('close');
}
