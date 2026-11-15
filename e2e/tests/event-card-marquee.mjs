import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-marquee-${process.pid}`;
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
const response = await fetch(`${base}/api/v1/events?limit=1`);
assert.equal(response.ok, true, 'Start the web and API servers before this test');
const envelope = await response.json();
const source = envelope.data[0];
assert.ok(source, 'Seed a published event before this test');
const longTitle = 'Festival Musik dan Pertemuan Komunitas Kreatif dari Seluruh Indonesia';
const longCreator = 'Komunitas Penyelenggara Pertunjukan Musik dan Seni Indonesia';
const labels = [
  ['Senja', 'Ruang'],
  [longTitle, longCreator],
  ['Dengar Bersama: Arsip Suara Kota', 'Rekam'],
  ['Panggung Cerita untuk Semua Penikmat Musik Indonesia', longCreator],
];
const fixtures = labels.map(([title, creator], index) => ({
  ...source,
  id: `marquee-event-${index}`,
  title,
  organizer: { ...source.organizer, organizationName: creator },
}));
const card = '.event-card:nth-child(2)';
const titleTrack = `${card} h3 .overflow-marquee-track`;
const creatorTrack = `${card} a[href^="/organizers/"] .overflow-marquee-track`;
function open() {
  browser('open', `${base}/events`);
  browser('wait', '.event-card');
  evaluate(`document.getAnimations().filter(animation =>
    animation.effect?.getComputedTiming().iterations !== Infinity).forEach(animation => animation.finish())`);
  evaluate('document.fonts.ready');
  wait(
    `document.querySelector(${JSON.stringify(card + ' h3 .overflow-marquee')})?.dataset.overflow === 'true'`,
  );
}

try {
  browser(
    'network',
    'route',
    '**/api/v1/events?*',
    '--body',
    JSON.stringify({
      ...envelope,
      data: fixtures,
      meta: { page: 1, limit: 12, total: 4, totalPages: 1 },
    }),
  );
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    open();
    const layout = evaluate(`(() => {
      const cards = [...document.querySelectorAll('.event-card')];
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        cards: cards.map(element => ({
          top: element.getBoundingClientRect().top,
          date: element.querySelector('.event-card-information p').getBoundingClientRect().top,
          price: element.querySelector('.event-card-information p:last-child').getBoundingClientRect().top,
          footer: element.querySelector('a[href^="/organizers/"]').getBoundingClientRect().top,
          height: element.getBoundingClientRect().height,
          titleHeight: element.querySelector('h3').getBoundingClientRect().height,
          title: element.querySelector('h3 .overflow-marquee-content').textContent,
          creator: element.querySelector('a[href^="/organizers/"] .overflow-marquee-content').textContent,
          duplicated: element.querySelectorAll('h3 [aria-hidden=true]').length,
          titleOverflow: element.querySelector('h3 .overflow-marquee').dataset.overflow,
          creatorOverflow: element.querySelector('a[href^="/organizers/"] .overflow-marquee').dataset.overflow,
          titleAnimation: getComputedStyle(element.querySelector('h3 .overflow-marquee-track')).animationName
        }))
      };
    })()`);
    assert.equal(layout.overflow, false, `No horizontal page overflow at ${width}px`);
    for (const [index, item] of layout.cards.entries()) {
      assert.equal(item.titleHeight, 24, 'Every title occupies one line');
      assert.equal(item.title, labels[index][0], 'The complete title is retained');
      assert.equal(item.creator, labels[index][1], 'The complete creator name is retained');
      for (const peer of layout.cards.filter(
        (candidate) => Math.abs(candidate.top - item.top) < 1,
      )) {
        for (const field of ['date', 'price', 'footer', 'height']) {
          assert.ok(Math.abs(item[field] - peer[field]) < 1, `${field} aligns within the same row`);
        }
      }
    }
    assert.equal(layout.cards[0].titleOverflow, 'false');
    assert.equal(layout.cards[0].creatorOverflow, 'false');
    assert.equal(layout.cards[0].titleAnimation, 'none', 'Short labels never animate');
    assert.equal(layout.cards[0].duplicated, 0, 'Short labels have no cloned text');
    assert.equal(layout.cards[1].titleOverflow, 'true');
    assert.equal(layout.cards[1].creatorOverflow, 'true');
    assert.equal(layout.cards[1].duplicated, 1, 'Loop copy is hidden from assistive technology');
    assert.equal(browser('a11y').counts.violations, 0);
    process.stdout.write(
      `PASS aligned cards and conditional title/creator marquees at ${width}px\n`,
    );
  }

  browser('set', 'viewport', '1440', '1000');
  open();
  wait(
    `document.querySelector('.event-card:nth-child(3) h3 .overflow-marquee')?.dataset.overflow === 'true'`,
  );
  browser('set', 'viewport', '390', '1000');
  wait(
    `document.querySelector('.event-card:nth-child(3) h3 .overflow-marquee')?.dataset.overflow === 'false'`,
  );
  assert.equal(
    evaluate(
      `getComputedStyle(document.querySelector('.event-card:nth-child(3) h3 .overflow-marquee-track')).animationName`,
    ),
    'none',
  );
  process.stdout.write('PASS resize stops scrolling when a title fits\n');

  browser('set', 'viewport', '1440', '1000');
  open();
  const loop = evaluate(`(() => {
    const track = document.querySelector(${JSON.stringify(titleTrack)});
    const copies = [...track.children];
    const animation = track.getAnimations()[0];
    animation.currentTime = animation.effect.getTiming().duration * 0.3;
    return {
      copyWidth: copies[0].getBoundingClientRect().width,
      trackWidth: track.getBoundingClientRect().width,
      transform: getComputedStyle(track).transform,
      duration: animation.effect.getTiming().duration,
      state: animation.playState
    };
  })()`);
  assert.ok(
    Math.abs(loop.trackWidth - loop.copyWidth * 2) < 1,
    'Equal copies create a seamless loop',
  );
  assert.ok(loop.duration >= 8000, 'Text moves at a readable speed');
  assert.equal(loop.state, 'running');
  wait(
    `getComputedStyle(document.querySelector(${JSON.stringify(titleTrack)})).transform !== ${JSON.stringify(loop.transform)}`,
  );
  browser('hover', `${card} h3`);
  assert.equal(
    evaluate(
      `getComputedStyle(document.querySelector(${JSON.stringify(titleTrack)})).animationPlayState`,
    ),
    'paused',
  );
  browser('click', `${card} .event-marquee-control`);
  browser('mouse', 'move', '0', '0');
  evaluate('document.activeElement.blur()');
  for (const selector of [titleTrack, creatorTrack]) {
    assert.equal(
      evaluate(
        `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).animationPlayState`,
      ),
      'paused',
    );
  }
  browser('click', `${card} .event-marquee-control`);
  browser('mouse', 'move', '0', '0');
  evaluate('document.activeElement.blur()');
  wait(
    `getComputedStyle(document.querySelector(${JSON.stringify(titleTrack)})).animationPlayState === 'running'`,
  );
  evaluate(`document.querySelector(${JSON.stringify(card + ' a')}).focus()`);
  assert.equal(
    evaluate(
      `getComputedStyle(document.querySelector(${JSON.stringify(titleTrack)})).animationPlayState`,
    ),
    'paused',
  );
  evaluate('document.activeElement.blur()');
  process.stdout.write('PASS automatic motion, hover/focus pause and persistent pause/resume\n');

  browser('set', 'media', 'light', 'reduced-motion');
  assert.equal(
    evaluate(
      `getComputedStyle(document.querySelector(${JSON.stringify(titleTrack)})).animationName`,
    ),
    'none',
  );
  assert.equal(
    evaluate(
      `getComputedStyle(document.querySelector(${JSON.stringify(card + ' .event-marquee-control')})).display`,
    ),
    'none',
  );
  assert.equal(
    evaluate(
      `getComputedStyle(document.querySelector(${JSON.stringify(titleTrack)})).textOverflow`,
    ),
    'ellipsis',
  );
  assert.equal(
    evaluate(`document.querySelector(${JSON.stringify(card + ' h3 .overflow-marquee')}).title`),
    longTitle,
    'The complete reduced-motion label is retained in its tooltip and accessible text',
  );
  assert.equal(browser('a11y').counts.violations, 0);
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write('PASS reduced motion, complete labels and accessibility\n');
} finally {
  browser('close');
}
