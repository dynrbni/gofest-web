import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-mobile-${process.pid}`;
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message ?? result.error);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;

try {
  for (const width of [320, 390, 480, 640, 767, 768, 1024, 1440]) {
    browser('set', 'viewport', String(width), '844');
    browser('open', base);
    browser('wait', '.home-event-shelf .event-card');
    evaluate('document.getElementById("cities-heading").scrollIntoView()');
    browser('wait', '.city-destinations a');
    evaluate(
      'document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).forEach(animation => animation.finish())',
    );
    const layout = evaluate(`(() => {
      const hero = document.querySelector('.hero-frame').getBoundingClientRect();
      const shelves = ['.home-event-shelf', '.home-category-grid', '.city-destinations'].map(selector => {
        const shelf = document.querySelector(selector);
        const children = [...shelf.children];
        const rows = new Set(children.map(child => Math.round(child.getBoundingClientRect().top)));
        shelf.scrollTo({left: shelf.scrollWidth, behavior: 'instant'});
        return {selector, rows: rows.size, scrolled: shelf.scrollLeft, width: shelf.clientWidth};
      });
      const cards = [...document.querySelectorAll('.home-event-shelf .event-card')];
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        heroRatio: hero.width / hero.height,
        shelves,
        cards: cards.map(card => ({width: card.clientWidth, height: card.clientHeight})),
      };
    })()`);
    assert.equal(layout.overflow, false, `Page fits ${width}px`);
    assert.ok(layout.heroRatio >= 3.19, `Landscape banner at ${width}px`);
    if (width < 768) {
      for (const shelf of layout.shelves) {
        assert.equal(shelf.rows, 1, `${shelf.selector} uses one row at ${width}px`);
        assert.ok(shelf.scrolled > 0, `${shelf.selector} scrolls sideways at ${width}px`);
      }
      for (const card of layout.cards) {
        assert.ok(
          card.width > Math.min(width * 0.6, 280),
          'Readable event card with next card visible',
        );
        assert.ok(card.height < 440, 'No stretched card or large empty space');
      }
      browser('focus', '.home-event-shelf .event-card:last-child a');
      assert.equal(
        evaluate(
          'document.activeElement.closest(".event-card") === document.querySelector(".home-event-shelf .event-card:last-child")',
        ),
        true,
        'Events beyond the first card are keyboard reachable',
      );
    } else {
      assert.equal(layout.shelves[0].scrolled, 0, 'Desktop events retain a grid');
    }
    assert.deepEqual(browser('a11y').violations, [], `Home accessibility at ${width}px`);
    process.stdout.write(
      `PASS ${width}px landscape banner, discovery layout, scrolling, sizing and accessibility.\n`,
    );
  }
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
} finally {
  browser('close');
}
