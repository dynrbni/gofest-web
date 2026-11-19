import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-creators-${process.pid}`;
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
const open = (path) => {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
  evaluate(`document.getAnimations().filter(animation =>
    animation.effect?.getComputedTiming().iterations !== Infinity).forEach(animation => animation.finish())`);
};
const result = await fetch(`${base}/api/v1/events?limit=1`);
assert.equal(result.ok, true, 'Start the local API and web servers before this test');
const { data: events } = await result.json();
assert.ok(events.length, 'Seed a published event before this test');
const creatorPath = `/organizers/${events[0].organizer.slug}`;
const creatorResult = await fetch(`${base}/api/v1${creatorPath}`);
const { data } = await creatorResult.json();
const creator = data.organizer;
assert.ok(creator.eventCounts.active > 0, 'The fixture creator needs an active event');

try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    open(creatorPath);
    browser('wait', '.event-card');
    const profile = evaluate(`(() => {
      const header = document.querySelector('main header');
      const cover = header.querySelector('.creator-cover').getBoundingClientRect();
      const avatar = header.querySelector('[aria-hidden]');
      const bounds = avatar.getBoundingClientRect();
      return {
        title: header.querySelector('h1').textContent,
        stats: [...header.querySelectorAll('dd')].map(element => element.textContent),
        coverWidth: cover.width, headerWidth: header.getBoundingClientRect().width,
        squareLogo: Math.abs(bounds.width - bounds.height) < 1,
        roundedLogo: getComputedStyle(avatar).borderRadius === '9999px',
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        description: header.textContent.includes(${JSON.stringify(creator.description || '__none__')})
      };
    })()`);
    assert.equal(profile.title, creator.organizationName);
    assert.equal(profile.stats[0], String(creator.eventCounts.total));
    assert.ok(/\d{4}/.test(profile.stats[1]), 'Join month and year are visible');
    assert.ok(Math.abs(profile.coverWidth - profile.headerWidth) < 1, 'Banner spans profile width');
    assert.equal(profile.squareLogo && profile.roundedLogo, true, 'Creator logo is circular');
    assert.equal(profile.overflow, false, `Profile fits ${width}px`);
    assert.equal(
      profile.description,
      Boolean(creator.description),
      'Configured profile description remains visible',
    );
    assert.equal(
      browser('a11y').counts.violations,
      0,
      `Active profile accessibility at ${width}px`,
    );

    browser(
      'find',
      'role',
      'tab',
      'click',
      '--name',
      `Event Lalu ${creator.eventCounts.past}`,
      '--exact',
    );
    wait('location.search.includes("period=past")');
    wait(
      'document.querySelector("[role=tab][aria-selected=true]")?.textContent.includes("Event Lalu")',
    );
    wait('document.querySelector("[role=tabpanel]")?.getAttribute("aria-busy") === "false"');
    assert.equal(
      evaluate('document.querySelector("[role=tab][aria-selected=true]").textContent.trim()'),
      `Event Lalu ${creator.eventCounts.past}`,
    );
    if (!creator.eventCounts.past) {
      assert.equal(evaluate('document.querySelectorAll(".event-card").length'), 0);
      browser('wait', '--text', 'Belum ada event lalu');
    }
    assert.equal(browser('a11y').counts.violations, 0, `Past profile accessibility at ${width}px`);
    browser('reload');
    browser('wait', '[role=tab][data-state=active][id$="past"]');
    assert.ok(evaluate('location.search.includes("period=past")'), 'Past tab survives reload');
    process.stdout.write(`PASS creator identity, tabs and accessibility at ${width}px\n`);
  }

  for (const path of ['/', '/events', creatorPath]) {
    open(path);
    browser('wait', '.event-card');
    const cards = evaluate(`[...document.querySelectorAll('.event-card')].map(card => {
      const poster = card.querySelector('.event-poster').getBoundingClientRect();
      const links = [...card.querySelectorAll('a')];
      const title = card.querySelector('h3');
      const footer = links[1];
      return {
        title: title.textContent,
        ratio: poster.width / poster.height,
        links: links.map(link => link.getAttribute('href')),
        nestedLinks: card.querySelectorAll('a a').length,
        date: card.querySelector('.event-card-information').textContent,
        divider: getComputedStyle(footer).borderTopStyle,
        creator: footer.textContent.trim()
      };
    })`);
    assert.ok(cards.length > 0);
    for (const card of cards) {
      assert.ok(card.title.length > 0);
      assert.ok(Math.abs(card.ratio - 2.5) < 0.02, `${path}: wide undistorted poster container`);
      assert.equal(card.links.length, 2, 'Event and creator have independent navigation');
      assert.ok(card.links[0].startsWith('/events/'));
      assert.ok(card.links[1].startsWith('/organizers/'));
      assert.equal(card.nestedLinks, 0);
      assert.ok(/\d{4}/.test(card.date), 'Event date is shown');
      assert.ok(/Rp|Gratis|Belum dijual/.test(card.date), 'Price is shown');
      assert.equal(card.divider, 'dashed');
      assert.ok(card.creator.length > 0);
    }
    process.stdout.write(`PASS shared event card structure and links on ${path}\n`);
  }

  browser('click', '.event-card a[href^="/organizers/"]');
  browser('wait', 'main header h1');
  browser('wait', '.event-card');
  browser('click', '.event-card a[href^="/events/"]');
  wait('location.pathname.startsWith("/events/")');
  wait(
    `document.querySelector('main h1')?.textContent === ${JSON.stringify(creator.events[0].title)}`,
  );
  assert.equal(evaluate('document.querySelector("main h1").textContent'), creator.events[0].title);
  process.stdout.write('PASS event card → creator → event detail navigation\n');

  open(creatorPath);
  browser('wait', '.event-card');
  evaluate(`document.querySelector('.creator-cover img')?.dispatchEvent(new Event('error'));
    document.querySelector('.event-card .event-poster img')?.dispatchEvent(new Event('error'));`);
  wait(
    '!document.querySelector(".creator-cover img") && !document.querySelector(".event-card")?.querySelector(".event-poster img")',
  );
  assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
  assert.equal(browser('a11y').counts.violations, 0, 'Readable artwork fallbacks');
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write('PASS missing artwork fallbacks\n');
} finally {
  browser('close');
}
