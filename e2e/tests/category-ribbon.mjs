import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-categories-${process.pid}`;
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message ?? `Failed: ${args[0]}`);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
function open(path) {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
  wait('!document.querySelector("[data-route-loading], [data-page-loading]")');
  wait('document.querySelector("#event-results")?.getAttribute("aria-busy") === "false"');
  wait(
    `document.querySelector('nav[aria-label="Kategori Event"]')?.getAttribute('aria-busy') === 'false'`,
  );
}

try {
  browser('set', 'viewport', '1440', '1000');
  browser('open', base);
  browser('wait', 'nav[aria-label="Pilih kategori"] a');
  wait('!document.querySelector("[data-route-loading], [data-page-loading]")');
  const homeCategories =
    evaluate(`([...document.querySelectorAll('nav[aria-label="Pilih kategori"] a')].map(link => ({
    name: link.textContent.trim(), href: link.getAttribute('href'), icon: !!link.querySelector('svg'),
  })))`);
  assert.ok(homeCategories.length >= 12, 'Home shows the expanded category catalog');
  for (const name of [
    'Religi',
    'Olahraga',
    'Pameran',
    'Wisata',
    'Talkshow',
    'Kompetisi',
    'Kuliner',
  ]) {
    assert.ok(
      homeCategories.some((category) => category.name === name),
      `${name} is a real category without description text`,
    );
  }
  assert.ok(
    homeCategories.every(
      (category) => category.icon && category.href.startsWith('/events?category='),
    ),
  );
  for (const width of [1440, 1024, 768, 640, 390, 320]) {
    browser('set', 'viewport', String(width), '900');
    const layout = evaluate(`(() => {
      const links = [...document.querySelectorAll('nav[aria-label="Pilih kategori"] a')];
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1,
        allFit: links.every(link => {
          const rect = link.getBoundingClientRect();
          const icon = link.querySelector('.category-symbol').getBoundingClientRect();
          const label = link.querySelector('.home-category-label').getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth && rect.width >= 44 &&
            icon.bottom <= label.top && label.height >= 44;
        }) };
    })()`);
    assert.equal(layout.overflow, false, `Home categories fit ${width}px`);
    assert.equal(
      layout.allFit,
      true,
      'Every category has an icon above its label and a full touch target',
    );
  }
  assert.equal(
    browser('a11y', '--selector', 'section[aria-labelledby="categories-heading"]').counts
      .violations,
    0,
  );
  browser('find', 'role', 'link', 'click', '--name', 'Religi', '--exact');
  wait('new URLSearchParams(location.search).get("category") === "religi"');
  wait('!document.querySelector("[data-route-loading], [data-page-loading]")');
  wait('scrollY === 0');
  browser('wait', '--text', 'Belum ada acara yang cocok');
  click('Lihat semua acara');
  wait('location.search === ""');
  browser('set', 'viewport', '1440', '1000');
  open('/events');
  const initialTotal = evaluate(
    'document.querySelector("#event-results [role=status]").textContent',
  );
  assert.ok(evaluate('document.querySelectorAll(".event-card").length') > 0);
  const categories = evaluate(
    '[...document.querySelectorAll(".catalog-category")].map(button => button.textContent.trim())',
  );
  assert.ok(categories.length > 2);
  for (const name of categories.slice(1)) {
    click(name);
    wait('document.querySelector("#event-results")?.getAttribute("aria-busy") === "false"');
    assert.equal(
      evaluate('document.querySelector(".catalog-category[aria-pressed=true]").textContent.trim()'),
      name,
    );
    assert.equal(
      evaluate('document.querySelectorAll(".catalog-category[aria-pressed=true]").length'),
      1,
    );
  }
  click('Semua acara');
  wait('location.search === ""');
  wait('document.querySelector("#event-results")?.getAttribute("aria-busy") === "false"');
  assert.equal(
    evaluate('document.querySelector("#event-results [role=status]").textContent'),
    initialTotal,
  );
  open(
    '/events?category=film&city=Bandung&price=free&availability=sold_out&dateFrom=2099-01-01&dateTo=2099-01-02&sort=published_newest',
  );
  wait('location.search === "?category=film"');
  const filmTotal = evaluate('document.querySelector("#event-results [role=status]").textContent');
  open('/events?category=film');
  assert.equal(
    evaluate('document.querySelector("#event-results [role=status]").textContent'),
    filmTotal,
    'Removed filters cannot silently narrow results',
  );
  assert.equal(
    evaluate('document.querySelectorAll("main select, main input[type=date]").length'),
    0,
  );
  assert.equal(
    evaluate(
      '[...document.querySelectorAll("a")].some(a => a.getAttribute("href")?.includes("price="))',
    ),
    false,
  );
  open('/events?q=zzzz-no-matching-event&category=film');
  browser('wait', '--text', 'Belum ada acara yang cocok');
  click('Hapus pencarian: zzzz-no-matching-event');
  wait('location.search === "?category=film"');
  open('/events?q=zzzz-no-matching-event&category=film');
  click('Lihat semua acara');
  wait('location.search === ""');

  for (const width of [1440, 1024, 768, 640, 390, 320]) {
    browser('set', 'viewport', String(width), '900');
    open('/events?category=workshop');
    const layout = evaluate(`(() => {
      const nav = document.querySelector('nav[aria-label="Kategori Event"]');
      const active = nav.querySelector('[aria-pressed=true]').getBoundingClientRect();
      const bounds = nav.getBoundingClientRect();
      const buttons = [...nav.querySelectorAll('button')].map(button => button.getBoundingClientRect());
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1,
        activeVisible: active.left >= bounds.left - 1 && active.right <= bounds.right + 1,
        sizes: buttons.map(rect => [rect.width, rect.height]),
        scrollable: nav.scrollWidth > nav.clientWidth, gap: buttons[1].left - buttons[0].right };
    })()`);
    assert.equal(layout.overflow, false, `No page overflow at ${width}px`);
    assert.equal(layout.activeVisible, true, `Direct-linked category visible at ${width}px`);
    assert.ok(
      layout.sizes.every(([w, h]) => w >= 44 && h >= 44 && w <= 120),
      'Compact touch targets',
    );
    assert.ok(Math.abs(layout.gap - 8) < 1, 'Category spacing stays compact');
    if (width < 640) assert.equal(layout.scrollable, true, 'Mobile ribbon can swipe');
  }
  browser('set', 'viewport', '640', '900');
  open('/events');
  click('Kategori berikutnya');
  wait('document.querySelector(".catalog-categories").scrollLeft > 20');
  click('Kategori sebelumnya');
  wait('document.querySelector(".catalog-categories").scrollLeft < 5');
  click('Semua acara');
  browser('press', 'Tab');
  browser('press', 'Enter');
  wait('new URLSearchParams(location.search).get("category") === "film"');
  assert.equal(evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
  assert.equal(browser('a11y', '--selector', 'main').counts.violations, 0);
  assert.deepEqual(browser('errors').errors, []);
  process.stdout.write(
    'PASS 12 home categories without descriptions, home/category navigation, category selection, all-events reset, legacy URL cleanup, search/empty recovery, responsive grid and compact ribbon at six widths, scroll arrows, keyboard focus, accessibility and zero runtime errors.\n',
  );
} finally {
  browser('close');
}
