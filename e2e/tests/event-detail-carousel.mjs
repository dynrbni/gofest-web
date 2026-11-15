import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-detail-${process.pid}`;
function browser(...args) {
  const output = execFileSync('agent-browser', ['--session', session, '--json', ...args], {
    encoding: 'utf8',
    timeout: 35_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.success, true, result.error?.message ?? result.error);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const open = (path) => {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
};
const finishAnimations = () =>
  evaluate('document.getAnimations().forEach(animation => animation.finish())');

try {
  browser('set', 'viewport', '1440', '1000');
  open('/');
  browser('wait', '.hero-slide-current .hero-banner-link[href^="/events/"]');
  browser('focus', '.carousel-arrow-right');
  const first = evaluate(
    'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
  );
  click('Sorotan berikutnya');
  assert.notEqual(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    first,
  );
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".hero-slide-incoming")).animationName'),
    'banner-in',
  );
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".hero-slide-outgoing")).animationName'),
    'banner-out',
  );
  finishAnimations();
  click('Sorotan sebelumnya');
  finishAnimations();
  assert.equal(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    first,
  );
  const count = evaluate('document.querySelectorAll(".carousel-dot").length');
  click(`Lihat sorotan ${count}`);
  click('Sorotan berikutnya');
  finishAnimations();
  assert.equal(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    first,
    'Last banner wraps to first',
  );
  assert.equal(
    evaluate('document.querySelectorAll(".event-carousel button").length'),
    count + 2,
    'Only pagination and two arrows',
  );
  const title = evaluate('document.querySelector(".hero-slide-current .hero-title").textContent');
  browser('click', '.hero-slide-current .hero-banner-link');
  browser('wait', '#event-title');
  assert.equal(evaluate('location.pathname'), first, 'Entire banner navigates to its event');
  assert.equal(evaluate('document.querySelector("h1").textContent'), title);

  const response = await fetch(new URL('/api/v1/events?limit=12', base));
  assert.equal(response.ok, true);
  const { data: events } = await response.json();
  let event;
  for (const item of events) {
    const result = await fetch(new URL(`/api/v1/events/${item.slug}`, base)).then((r) => r.json());
    if (
      result.data?.event?.ticketTypes.filter((ticket) => ticket.isOnSale && ticket.available > 0)
        .length >= 2
    ) {
      event = result.data.event;
      break;
    }
  }
  assert.ok(event, 'A published event with two available ticket categories is required');
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    open('/events');
    open(`/events/${event.slug}`);
    browser('wait', '#event-title');
    finishAnimations();
    evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Detail fits ${width}px`,
    );
    assert.equal(browser('a11y').counts.violations, 0, `Detail accessibility at ${width}px`);
    const layout = evaluate(`(() => {
      const heading = document.querySelector('.event-detail-heading').getBoundingClientRect();
      const summary = document.querySelector('.event-detail-summary').getBoundingClientRect();
      return { headingRight: heading.right, summaryLeft: summary.left, headingBottom: heading.bottom, summaryTop: summary.top };
    })()`);
    if (width >= 1024)
      assert.ok(layout.summaryLeft > layout.headingRight, 'Poster is beside event details');
    else
      assert.ok(layout.summaryTop >= layout.headingBottom, 'Poster stacks below details on mobile');
    browser('click', '.event-summary-card button');
    browser('wait', 'input[name="ticket-category"]');
    assert.equal(
      evaluate('document.querySelector("[role=tab][aria-selected=true]").textContent'),
      'Tiket',
    );
    const chosen = event.ticketTypes.filter((ticket) => ticket.isOnSale && ticket.available > 0)[1];
    browser('check', `input[value="${chosen.id}"]`);
    assert.ok(
      evaluate('document.querySelector(".event-detail-summary").textContent').includes(
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(chosen.price),
      ),
    );
    const checkout = evaluate(
      `document.querySelector('.event-detail-summary a[href^="/checkout/"]').getAttribute('href')`,
    );
    assert.equal(
      new URL(checkout, base).searchParams.get('ticket'),
      chosen.id,
      'Selected category reaches checkout',
    );
    assert.equal(
      browser('a11y').counts.violations,
      0,
      `Ticket selection accessibility at ${width}px`,
    );
    if (width === 1440) {
      browser('click', '.event-detail-summary a[href^="/checkout/"]');
      browser('wait', 'main h1');
      wait(`new URLSearchParams(location.search).get('ticket') === ${JSON.stringify(chosen.id)}`);
      browser('wait', '#checkout-name');
      assert.equal(evaluate('location.pathname'), `/checkout/${event.slug}`);
    }
  }
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write(
    'PASS banner links, directional transitions, wraparound, no stop button, responsive detail and ticket selection at five widths, selected ticket checkout, accessibility and zero browser errors.\n',
  );
} finally {
  browser('close');
}
